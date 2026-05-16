package com.careerfit.backend.common.util;

import com.careerfit.backend.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Local filesystem implementation of CV storage.
 * Files are stored under the configured base path.
 *
 * The interface is designed so a cloud implementation (S3 / Supabase Storage)
 * can replace this without changing any service logic.
 */
@Service
public class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final Path basePath;
    private final long maxBytes;

    public StorageService(AppProperties props) throws IOException {
        this.basePath = Paths.get(props.getLocalStoragePath()).toAbsolutePath().normalize();
        this.maxBytes = (long) props.getMaxFileSizeMb() * 1024 * 1024;
        Files.createDirectories(basePath);
        log.info("CV storage initialized at: {}", basePath);
    }

    /**
     * Store a CV file uploaded via multipart.
     * Returns the relative path stored in DB.
     *
     * @throws StorageException on IO error or file too large
     */
    public String store(MultipartFile file, UUID cvId) {
        validateSize(file);

        String originalName = file.getOriginalFilename() != null
                ? sanitize(file.getOriginalFilename())
                : "cv.pdf";

        String filename = cvId.toString() + "_" + originalName;
        Path dest = basePath.resolve(filename);

        try {
            Files.copy(file.getInputStream(), dest);
            log.info("Stored CV file: {} ({} bytes)", filename, file.getSize());
            return filename;
        } catch (IOException e) {
            throw new StorageException("Failed to store file: " + e.getMessage(), e);
        }
    }

    /**
     * Resolve a stored path back to a Java File for reading.
     */
    public File resolve(String relativePath) {
        File file = basePath.resolve(relativePath).toFile();
        if (!file.exists()) {
            throw new StorageException("File not found: " + relativePath);
        }
        return file;
    }

    /**
     * Delete a stored CV file.
     */
    public void delete(String relativePath) {
        try {
            Path path = basePath.resolve(relativePath);
            Files.deleteIfExists(path);
            log.info("Deleted CV file: {}", relativePath);
        } catch (IOException e) {
            log.warn("Failed to delete file: {} — {}", relativePath, e.getMessage());
        }
    }

    private void validateSize(MultipartFile file) {
        if (file.getSize() > maxBytes) {
            throw new StorageException(
                "File size (" + file.getSize() / (1024 * 1024) + " MB) exceeds " +
                maxBytes / (1024 * 1024) + " MB limit");
        }
    }

    /** Strip path traversal characters. */
    private String sanitize(String name) {
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    public static class StorageException extends RuntimeException {
        public StorageException(String message) { super(message); }
        public StorageException(String message, Throwable cause) { super(message, cause); }
    }
}
