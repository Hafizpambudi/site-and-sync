---
title: "API Deployment using Code engine from IBM Cloud Services"
slug: "api-deployment-using-code-engine-from-ibm-cloud-services"
summary: "deploy api to code engine services"
date: "2024-06-05"
role: ""
tags:
featured: false
notionId: "31c93418-640f-4c9d-b0e0-a41cafc11bd5"
notionLastEdited: "2026-11-28T04:01:00.000Z"
---

### For Indonesian Version

[medium.com](https://medium.com/@budihafiz46_75661/deploy-api-menggunakan-docker-ibm-code-engine-service-1873ddccdc08)

# Project Overview

In this project, we Tried to deploy an API to the IBM Cloud Code Engine, transforming our previously built API into a publicly accessible service ([check for detail process](/74667f8d46844bb299ce17897deb78c9)). Utilizing Docker, we encapsulated the API in a container image, ensuring a seamless and efficient deployment process. The primary objective of this deployment was to obtain a public endpoint URL for the API, enabling its integration and consumption across various platforms.

By leveraging IBM Cloud Code Engine, we ensured scalability and reliability for our API, allowing users to access the service from anywhere with ease. This deployment not only enhanced the accessibility of our API but also demonstrated the power of cloud services in bringing AI-driven solutions to a broader audience.

**here’s the architecture flow : **

![ARCHITECTURE](/content/case-studies/api-deployment-using-code-engine-from-ibm-cloud-services/07b79d788a5b.jpg)

### Architecture Explanation

Docker is used to package the source code into a container image. The container image will be pushed to IBM Cloud's Container Registry service to store the container online. The container is then integrated into Code Engine for deployment, resulting in a public endpoint API URL."

# **The Approach and Process**

### Build auto requirements

```bash
pip freeze > requirements.txt
```

All the requirements needed to build this project will be generated automatically and will produce a requirements.txt file

### Build Dockerfile

```go
FROM python:3.10-slim

WORKDIR /app

COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

The Dockerfile code above uses a lightweight (`slim`) base image of Python version 3.10 and sets the working directory inside the container to `/app`. All files from the current directory on the host are copied to this working directory inside the container. Next, the application's dependencies are installed using pip without saving the cache, based on the list in `requirements.txt`. This Dockerfile also states that the container will use port 8000 for communication. The default command to run the application using `uvicorn` (an ASGI server) is specified, which runs the application from the `app` module on host `0.0.0.0` and port 8000. Thus, the created container will run a web-based Python application (e.g., a FastAPI application) using `uvicorn` on port 8000 when executed.

### Structure File

![**image 2 **](/content/case-studies/api-deployment-using-code-engine-from-ibm-cloud-services/8760647f9d50.jpg)

### Build Container Image

make sure docker has been installed on your device

Image 2 is the directory structure of this project. Three files have been added to build the container using Docker : Dockerfile, requirements.txt, and .dockerignore.

```bash
docker build -t your image-name .
```

```bash
docker run -d -p 8000:8000 your-image-name
```

### IBM Setup

```bash
ibmcloud login --apikey  your_api_key
```

**How to get api key for login ? check this tutorial**

1. Log in to your IBM Cloud account.
2. Follow the steps in the image below.

![image 3 ](/content/case-studies/api-deployment-using-code-engine-from-ibm-cloud-services/76cda7c30b10.jpg)

3. Create an API key for logging in. Paste the API key into the bash code above.

**Setup IBM Plugin **

```bash
ibmcloud plugin install code-engine
ibmcloud plugin install container-registry -r 'IBM Cloud'
```

Install the plugin intended to connect IBM services that will be used locally. In this case, we will use two services from IBM Cloud: Code Engine and Container Registry.

### Container Registry Configuration and Container image push

You need to create a new Project and a new namespace first on the Container Registry service in the IBM Cloud website dashboard.

```bash
ibmcloud cr login
```

```go
docker push us.icr.io/namespace_name/name_a
```

- Create a new namespace on the IBM Container Registry dashboard.
- Push the previously built container image using the bash code below (ensure Docker is running when pushing the container).

### Container Registry and Code Engine Integration

To integrate the container registry with Code Engine, a registry secret is required. This registry secret is a policy created by IBM to ensure privacy. Here is the guide:
**First, you have to** c**reate a Code Engine project using the CLI.**

```bash
ibmcloud ce project create --name yourprojectname
```

![**Image 4** ](/content/case-studies/api-deployment-using-code-engine-from-ibm-cloud-services/b7e60b963916.jpg)

![**Image 5**](/content/case-studies/api-deployment-using-code-engine-from-ibm-cloud-services/43a5b0b5d49a.jpg)

Go to the IBM Cloud service Code Engine dashboard. Enter the project that was created using the CLI previously. In the configuration menu, add a registry secret. Fill it in as required, such as the registry secret name and IAM API key (refer to images 4 and 5 for detailed guidance).

### Deploy Container Image to Code Engine

```bash
ibmcloud ce project select --name project_code_engine_name
```

```bash
ibmcloud ce application create --name project_code_engine_name --image private.us.icr.io/ce_namespace/cr_projectname --port 8000 --registry-secret ce_registry name
```

The above code will operate the container image that was previously pushed into the container registry space for deployment into the Code Engine project which has been setup previously. This deployment stage will result in an output in the form of a public API endpoint URL.

### Get Public Endpoint URL

![](/content/case-studies/api-deployment-using-code-engine-from-ibm-cloud-services/ae0f35eff535.jpg)

If the API container image has been successfully deployed, it will be indicated by the appearance of a public API endpoint URL that is ready to be used on various platforms.

Congratss
