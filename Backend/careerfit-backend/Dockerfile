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
# Add bash for wait-for-it if needed
RUN apk add --no-cache bash tzdata
ENV TZ=Asia/Ho_Chi_Minh

COPY --from=builder /app/target/careerfit-backend-*.jar app.jar
EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
