package com.careerfit.backend.cv.service;

import com.careerfit.backend.config.AppProperties;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.awt.image.WritableRaster;

/**
 * Prepares scanned CV pages for OCR without changing the stored source file.
 * The implementation intentionally uses Java2D only so OCR does not gain a
 * native OpenCV runtime dependency.
 */
@Service
public class ImagePreprocessingService {

    private static final int WHITE = 255;
    private static final int CROP_THRESHOLD = 245;
    private static final int CROP_PADDING = 24;
    private static final int ADAPTIVE_BLOCK_SIZE = 32;
    private static final double MAX_DESKEW_DEGREES = 4.0;
    private static final double DESKEW_STEP_DEGREES = 0.5;

    private final AppProperties properties;

    public ImagePreprocessingService(AppProperties properties) {
        this.properties = properties;
    }

    public PreprocessingResult preprocess(BufferedImage source) {
        if (source == null || source.getWidth() < 2 || source.getHeight() < 2) {
            throw new IllegalArgumentException("Image is missing or too small to preprocess");
        }

        BufferedImage image = toGrayscaleOnWhite(source);
        boolean inverted = shouldInvert(image);
        if (inverted) image = invert(image);

        image = cropWhitespace(image);
        image = resizeForOcr(image);
        image = stretchContrast(image);
        image = removeIsolatedNoise(image);

        double deskewDegrees = estimateDeskewDegrees(image);
        if (Math.abs(deskewDegrees) >= DESKEW_STEP_DEGREES) {
            image = cropWhitespace(rotate(image, deskewDegrees));
        } else {
            deskewDegrees = 0.0;
        }

        image = adaptiveBinarize(image);
        return new PreprocessingResult(image, true, deskewDegrees, inverted);
    }

    private BufferedImage toGrayscaleOnWhite(BufferedImage source) {
        BufferedImage rgb = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = rgb.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, rgb.getWidth(), rgb.getHeight());
            graphics.drawImage(source, 0, 0, null);
        } finally {
            graphics.dispose();
        }

        BufferedImage gray = new BufferedImage(rgb.getWidth(), rgb.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        WritableRaster raster = gray.getRaster();
        for (int y = 0; y < rgb.getHeight(); y++) {
            for (int x = 0; x < rgb.getWidth(); x++) {
                int pixel = rgb.getRGB(x, y);
                int red = (pixel >> 16) & 0xff;
                int green = (pixel >> 8) & 0xff;
                int blue = pixel & 0xff;
                int luminance = (red * 299 + green * 587 + blue * 114) / 1000;
                raster.setSample(x, y, 0, luminance);
            }
        }
        return gray;
    }

    private boolean shouldInvert(BufferedImage image) {
        int band = Math.max(1, Math.min(12, Math.min(image.getWidth(), image.getHeight()) / 20));
        long sum = 0;
        long count = 0;
        for (int y = 0; y < image.getHeight(); y += Math.max(1, image.getHeight() - band)) {
            for (int yy = y; yy < Math.min(image.getHeight(), y + band); yy++) {
                for (int x = 0; x < image.getWidth(); x++) {
                    sum += gray(image, x, yy);
                    count++;
                }
            }
        }
        for (int x = 0; x < image.getWidth(); x += Math.max(1, image.getWidth() - band)) {
            for (int xx = x; xx < Math.min(image.getWidth(), x + band); xx++) {
                for (int y = band; y < Math.max(band, image.getHeight() - band); y++) {
                    sum += gray(image, xx, y);
                    count++;
                }
            }
        }
        return count > 0 && sum / count < 120;
    }

    private BufferedImage invert(BufferedImage source) {
        BufferedImage result = copyGray(source);
        WritableRaster raster = result.getRaster();
        for (int y = 0; y < result.getHeight(); y++) {
            for (int x = 0; x < result.getWidth(); x++) {
                raster.setSample(x, y, 0, WHITE - gray(source, x, y));
            }
        }
        return result;
    }

    private BufferedImage cropWhitespace(BufferedImage source) {
        int minX = source.getWidth();
        int minY = source.getHeight();
        int maxX = -1;
        int maxY = -1;
        for (int y = 0; y < source.getHeight(); y++) {
            for (int x = 0; x < source.getWidth(); x++) {
                if (gray(source, x, y) < CROP_THRESHOLD) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }
        if (maxX < minX || maxY < minY) return source;

        minX = Math.max(0, minX - CROP_PADDING);
        minY = Math.max(0, minY - CROP_PADDING);
        maxX = Math.min(source.getWidth() - 1, maxX + CROP_PADDING);
        maxY = Math.min(source.getHeight() - 1, maxY + CROP_PADDING);
        int width = maxX - minX + 1;
        int height = maxY - minY + 1;
        if (width >= source.getWidth() * 0.98 && height >= source.getHeight() * 0.98) return source;

        BufferedImage result = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D graphics = result.createGraphics();
        try {
            graphics.drawImage(source, 0, 0, width, height, minX, minY, maxX + 1, maxY + 1, null);
        } finally {
            graphics.dispose();
        }
        return result;
    }

    private BufferedImage resizeForOcr(BufferedImage source) {
        int minWidth = Math.max(1, properties.getOcrPreprocessingMinWidth());
        long maxPixels = Math.max(1_000_000L, properties.getOcrPreprocessingMaxPixels());
        double scaleForWidth = source.getWidth() < minWidth
                ? Math.min(2.5, (double) minWidth / source.getWidth())
                : 1.0;
        double scaleForPixels = Math.sqrt((double) maxPixels / ((long) source.getWidth() * source.getHeight()));
        double scale = Math.min(scaleForWidth, scaleForPixels);
        if (scaleForPixels < 1.0) scale = scaleForPixels;
        if (Math.abs(scale - 1.0) < 0.05) return source;

        int width = Math.max(2, (int) Math.round(source.getWidth() * scale));
        int height = Math.max(2, (int) Math.round(source.getHeight() * scale));
        BufferedImage result = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D graphics = result.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.drawImage(source, 0, 0, width, height, null);
        } finally {
            graphics.dispose();
        }
        return result;
    }

    private BufferedImage stretchContrast(BufferedImage source) {
        int[] histogram = histogram(source);
        int pixels = source.getWidth() * source.getHeight();
        int low = percentile(histogram, pixels, 0.01);
        int high = percentile(histogram, pixels, 0.99);
        if (high - low < 24) return source;

        BufferedImage result = copyGray(source);
        WritableRaster raster = result.getRaster();
        for (int y = 0; y < source.getHeight(); y++) {
            for (int x = 0; x < source.getWidth(); x++) {
                int value = gray(source, x, y);
                int stretched = (value - low) * WHITE / (high - low);
                raster.setSample(x, y, 0, clamp(stretched, 0, WHITE));
            }
        }
        return result;
    }

    private BufferedImage removeIsolatedNoise(BufferedImage source) {
        BufferedImage result = copyGray(source);
        WritableRaster raster = result.getRaster();
        for (int y = 1; y < source.getHeight() - 1; y++) {
            for (int x = 1; x < source.getWidth() - 1; x++) {
                int center = gray(source, x, y);
                int brightNeighbors = 0;
                int darkNeighbors = 0;
                for (int yy = y - 1; yy <= y + 1; yy++) {
                    for (int xx = x - 1; xx <= x + 1; xx++) {
                        if (xx == x && yy == y) continue;
                        int value = gray(source, xx, yy);
                        if (value > 220) brightNeighbors++;
                        if (value < 70) darkNeighbors++;
                    }
                }
                if (center < 40 && brightNeighbors >= 7) raster.setSample(x, y, 0, WHITE);
                if (center > 240 && darkNeighbors >= 7) raster.setSample(x, y, 0, 0);
            }
        }
        return result;
    }

    private double estimateDeskewDegrees(BufferedImage source) {
        int threshold = otsuThreshold(histogram(source), source.getWidth() * source.getHeight());
        ProjectionScore zero = projectionScore(source, threshold, 0.0);
        ProjectionScore best = zero;
        for (double angle = -MAX_DESKEW_DEGREES; angle <= MAX_DESKEW_DEGREES; angle += DESKEW_STEP_DEGREES) {
            if (Math.abs(angle) < 0.01) continue;
            ProjectionScore current = projectionScore(source, threshold, angle);
            if (current.score() > best.score()) best = current;
        }
        if (best.inkPixels() < 100 || best.score() < zero.score() * 1.04) return 0.0;
        return best.angle();
    }

    private ProjectionScore projectionScore(BufferedImage source, int threshold, double angleDegrees) {
        int longestSide = Math.max(source.getWidth(), source.getHeight());
        int sampleStep = Math.max(1, (longestSide + 799) / 800);
        double radians = Math.toRadians(angleDegrees);
        double sin = Math.sin(radians);
        double cos = Math.cos(radians);
        int margin = (int) Math.ceil(Math.abs(sin) * source.getWidth()) + 4;
        int[] rows = new int[source.getHeight() + margin * 2 + 8];
        int inkPixels = 0;
        for (int y = 0; y < source.getHeight(); y += sampleStep) {
            for (int x = 0; x < source.getWidth(); x += sampleStep) {
                if (gray(source, x, y) >= threshold) continue;
                int row = (int) Math.round(sin * x + cos * y) + margin;
                if (row >= 0 && row < rows.length) {
                    rows[row]++;
                    inkPixels++;
                }
            }
        }
        long score = 0;
        for (int count : rows) score += (long) count * count;
        return new ProjectionScore(angleDegrees, score, inkPixels);
    }

    private BufferedImage rotate(BufferedImage source, double angleDegrees) {
        double radians = Math.toRadians(angleDegrees);
        double sin = Math.abs(Math.sin(radians));
        double cos = Math.abs(Math.cos(radians));
        int width = (int) Math.ceil(source.getWidth() * cos + source.getHeight() * sin);
        int height = (int) Math.ceil(source.getHeight() * cos + source.getWidth() * sin);
        BufferedImage result = new BufferedImage(width, height, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D graphics = result.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, width, height);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            AffineTransform transform = new AffineTransform();
            transform.translate((width - source.getWidth()) / 2.0, (height - source.getHeight()) / 2.0);
            transform.rotate(radians, source.getWidth() / 2.0, source.getHeight() / 2.0);
            graphics.drawRenderedImage(source, transform);
        } finally {
            graphics.dispose();
        }
        return result;
    }

    private BufferedImage adaptiveBinarize(BufferedImage source) {
        int globalThreshold = otsuThreshold(histogram(source), source.getWidth() * source.getHeight());
        int blocksX = (source.getWidth() + ADAPTIVE_BLOCK_SIZE - 1) / ADAPTIVE_BLOCK_SIZE;
        int blocksY = (source.getHeight() + ADAPTIVE_BLOCK_SIZE - 1) / ADAPTIVE_BLOCK_SIZE;
        int[][] localMeans = new int[blocksY][blocksX];

        for (int blockY = 0; blockY < blocksY; blockY++) {
            for (int blockX = 0; blockX < blocksX; blockX++) {
                int startX = blockX * ADAPTIVE_BLOCK_SIZE;
                int startY = blockY * ADAPTIVE_BLOCK_SIZE;
                int endX = Math.min(source.getWidth(), startX + ADAPTIVE_BLOCK_SIZE);
                int endY = Math.min(source.getHeight(), startY + ADAPTIVE_BLOCK_SIZE);
                long sum = 0;
                int count = 0;
                for (int y = startY; y < endY; y++) {
                    for (int x = startX; x < endX; x++) {
                        sum += gray(source, x, y);
                        count++;
                    }
                }
                localMeans[blockY][blockX] = count == 0 ? WHITE : (int) (sum / count);
            }
        }

        BufferedImage result = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_BYTE_BINARY);
        WritableRaster raster = result.getRaster();
        for (int y = 0; y < source.getHeight(); y++) {
            for (int x = 0; x < source.getWidth(); x++) {
                int localMean = localMeans[y / ADAPTIVE_BLOCK_SIZE][x / ADAPTIVE_BLOCK_SIZE];
                int threshold = clamp((globalThreshold * 3 + localMean - 12) / 4, 70, 235);
                raster.setSample(x, y, 0, gray(source, x, y) < threshold ? 0 : 1);
            }
        }
        return result;
    }

    private int[] histogram(BufferedImage image) {
        int[] histogram = new int[256];
        for (int y = 0; y < image.getHeight(); y++) {
            for (int x = 0; x < image.getWidth(); x++) histogram[gray(image, x, y)]++;
        }
        return histogram;
    }

    private int percentile(int[] histogram, int total, double percentile) {
        int target = Math.max(1, (int) Math.round(total * percentile));
        int cumulative = 0;
        for (int value = 0; value < histogram.length; value++) {
            cumulative += histogram[value];
            if (cumulative >= target) return value;
        }
        return WHITE;
    }

    private int otsuThreshold(int[] histogram, int total) {
        long weightedTotal = 0;
        for (int i = 0; i < histogram.length; i++) weightedTotal += (long) i * histogram[i];

        long weightedBackground = 0;
        int background = 0;
        double maxVariance = -1;
        int threshold = 180;
        for (int value = 0; value < histogram.length; value++) {
            background += histogram[value];
            if (background == 0) continue;
            int foreground = total - background;
            if (foreground == 0) break;
            weightedBackground += (long) value * histogram[value];
            double meanBackground = (double) weightedBackground / background;
            double meanForeground = (double) (weightedTotal - weightedBackground) / foreground;
            double variance = (double) background * foreground * Math.pow(meanBackground - meanForeground, 2);
            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = value;
            }
        }
        return clamp(threshold, 60, 235);
    }

    private BufferedImage copyGray(BufferedImage source) {
        BufferedImage copy = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_BYTE_GRAY);
        copy.getRaster().setRect(source.getRaster());
        return copy;
    }

    private int gray(BufferedImage image, int x, int y) {
        return image.getRaster().getSample(x, y, 0);
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    public record PreprocessingResult(
            BufferedImage image,
            boolean changed,
            double deskewDegrees,
            boolean inverted
    ) {}

    private record ProjectionScore(double angle, long score, int inkPixels) {}
}
