# Stage 1: Build
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN sh ./mvnw dependency:go-offline
COPY src ./src
RUN sh ./mvnw clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN apk add --no-cache \
    bash \
    tzdata \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-vie \
    curl \
    su-exec

ENV TZ=Asia/Ho_Chi_Minh

RUN addgroup -S careerfit && adduser -S careerfit -G careerfit && \
    mkdir -p /app/storage /app/logs && \
    chown -R careerfit:careerfit /app

COPY --from=builder /app/target/careerfit-backend-*.jar app.jar
EXPOSE 8080

USER careerfit

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health/readiness || exit 1

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
