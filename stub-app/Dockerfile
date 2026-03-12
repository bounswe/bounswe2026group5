# Use BusyBox as a super-lightweight web server
FROM busybox:1.36

# Create a non-root user for security
RUN adduser -D static

# Set the working directory
WORKDIR /home/static

# Copy the app files
COPY . .

# Switch to the non-root user
USER static

# Run the httpd server on port 8080
CMD ["httpd", "-f", "-p", "8080", "-h", "/home/static"]

# Expose the port
EXPOSE 8080
