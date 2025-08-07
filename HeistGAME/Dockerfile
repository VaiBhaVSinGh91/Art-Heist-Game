# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container at /app
COPY ./requirements.txt /app/requirements.txt

# Install any needed packages specified in requirements.txt
# Using --no-cache-dir reduces the image size
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the application's code into the container at /app
COPY . /app

# Expose the port the app runs on
EXPOSE 8000

# Define the command to run the app using uvicorn
# The host 0.0.0.0 is important to allow external connections inside the container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]