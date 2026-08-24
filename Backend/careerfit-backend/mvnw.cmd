@REM ----------------------------------------------------------------------------
@REM Maven Start Up Batch script (Windows)
@REM ----------------------------------------------------------------------------
@echo off

set MAVEN_CMD_LINE_ARGS=%*
set "BASE_DIR=%~dp0"

set WRAPPER_JAR="%~dp0.mvn\wrapper\maven-wrapper.jar"
set WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain

for /f "usebackq tokens=1,2 delims==" %%a in (".mvn\wrapper\maven-wrapper.properties") do (
    if "%%a"=="distributionUrl" set MAVEN_DISTRIBUTION_URL=%%b
)

java -classpath %WRAPPER_JAR% -Dmaven.multiModuleProjectDirectory="%BASE_DIR%." %WRAPPER_LAUNCHER% %MAVEN_CMD_LINE_ARGS%
