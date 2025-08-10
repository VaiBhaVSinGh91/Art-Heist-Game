# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set python to produce unbuffered output, which is crucial for viewing logs in real-time.
ENV PYTHONUNBUFFERED 1

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file first to leverage Docker's layer caching.
# This means dependencies are only re-installed when requirements.txt changes.
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
# Using --no-cache-dir reduces the image size
RUN pip install --no-cache-dir -r requirements.txt

# Now copy the rest of the application's code into the container.
# The source '.' is the build context (HeistGAME).
# The destination '.' is the WORKDIR (/app).
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the app using uvicorn
# The host 0.0.0.0 is important to allow external connections inside the container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]