---
title: "Building API for Image classfication model using FAST API + PYTORCH"
slug: "building-api-for-image-classification-model-using-fast-api"
summary: "API Bulding"
date: "2024-05-22"
role: ""
tags:
featured: false
notionId: "74667f8d-4684-4bb2-99ce-17897deb78c9"
notionLastEdited: "2026-11-28T08:29:00.000Z"
---

### For Indonesian Version

[medium.com](https://medium.com/@budihafiz46_75661/membangun-api-untuk-model-deep-cnn-image-classification-berbasis-pytorch-e60ffab5125c)

# **Project Overview**

In this project, I developed an API for a fish disease image classification model using FastAPI and PyTorch. This API allows users to upload an image of a sick fish, which is then processed by the model to identify the disease affecting the fish. FastAPI's high performance ensures swift and reliable responses, making this tool accessible and efficient for fish farmers and aquarium enthusiasts.

The API leverages a PyTorch model that build before ([check model](/6cada799d3854da1b0602f2c32182ca6)), providing accurate diagnoses. This integration demonstrates the potential of AI-driven solutions in addressing real-world problems in aquaculture.

# Approaches and Process

### Create Python Environment

Creating a Python virtual environment is intended to establish an isolated environment. This ensures that any libraries or packages installed will not be installed globally.

```bash
python -m venv venv
venv\Scripts\activate
```

### Redesign Architecture CNN

```python
#app.py
from fastapi import FastAPI, File, UploadFile
from PIL import Image
import io
from torch import nn, optim
import numpy as np
import torchvision.models as models
import torch
import torch.nn as nn
from torchvision import transforms

app = FastAPI()

labels = [
    "Bakteri Red. Gunakan antibiotik seperti oxytetracycline, isolasi ikan terinfeksi, perbaiki kualitas air dengan pergantian rutin dan aerasi, serta disinfeksi kolam dengan larutan klorin atau formalin.",
    "Aeromoniasis. Pengobatan dengan antibiotik seperti oxytetracycline, jaga kualitas air optimal, tambahkan probiotik ke dalam pakan, dan isolasi ikan yang terinfeksi untuk perawatan intensif.",
    "Bacteri grill. Gunakan antibiotik seperti chloramphenicol, tingkatkan aerasi untuk pasokan oksigen, jaga kualitas air, dan tambahkan garam ikan (NaCl) untuk mengurangi infeksi.",
    "Jamur. Obati dengan antijamur seperti malachite green atau formalin, isolasi ikan terinfeksi, tambahkan garam ikan (NaCl), dan pastikan air bersih dengan sirkulasi baik.",
    "Sehat. tetap waspada",
    "Parasit. Gunakan obat parasit seperti praziquantel atau metronidazole, isolasi ikan yang terinfeksi, jaga kualitas air, dan bersihkan kolam serta ganti air secara berkala.",
    "Ekor putih. Pengobatan dengan antibiotik seperti tetracycline, isolasi ikan yang terinfeksi, pastikan air bersih dengan pH seimbang dan oksigen cukup, serta tambahkan garam ikan (NaCl) untuk membantu penyembuhan."
]

model = models.mobilenet_v3_large(pretrained=True)
output_size = 7

for param in model.parameters():
  param.requires_grad = False

class Fishmodel (nn.Module) :
  def freeze (self) :
    for param in self.model.parameters():
      param.requires_grad = False
  def unfreeze (self) :
    for param in model.parameters():
      param.requires_grad = True
  def __init__(self, output_size) :
    super ().__init__()
    self.model = models.mobilenet_v3_large(pretrained=True)
    self.freeze()
    self.model.classifier = nn.Sequential(
    nn.Linear ( 960, output_size),
    nn.Softmax()
)

  def forward (self,x) :
    return self.model(x)
```

In deep learning with CNN, when we save a model, only the weights of the model are saved. Therefore, when we want to load the model again, we need to redefine the architecture of the created model. Ensure to check the model's architecture details.

### Model Load and Transform

```python
def get_transform():
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
model = Fishmodel(output_size)
model.load_state_dict(torch.load('model.pth', map_location=torch.device('cpu')))
model.eval()
transform = get_transform()
```

We load the `model.pth` file, which contains the weights from the previously trained model. The `model` variable is populated with the architecture of the model that has been defined beforehand. The `transform` function is used to transform the images that the user inputs later on.

### Create Predict Function

```python
def predict_image(img):
    img = transform(img)
    img = img.unsqueeze(0)  # Add batch dimension

    with torch.no_grad():
        outputs = model(img)
        _, predicted = torch.max(outputs, 1)
        predicted_class_index = predicted.item()
        predicted_class = labels[predicted_class_index]

    return f"Ikan anda mengalami penyakit {predicted_class}."
```

### Design API

Create the `predict_image` function to perform image classification predictions. This function will return the classification result, which will be aligned with the labels that have been defined previously.

```python
@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents))

    result = predict_image(img)

    return {"prediction": result}

if __name__ == "__main__":
    import nest_asyncio
    import uvicorn
    from pyngrok import ngrok

    # Apply the nest_asyncio fix
    nest_asyncio.apply()

    # Authenticate ngrok with your authtoken
    authtoken = "your ngrok token"
    ngrok.set_auth_token(authtoken)

    # Create a tunnel to the web server
    public_url = ngrok.connect(8000, bind_tls=True)
    print("Public URL:", public_url)

    # Run the FastAPI app
    uvicorn.run(app, host='0.0.0.0', port=8000)
```

Creating an API workflow route. /predict is the endpoint for making predictions using the POST method because the API will request an image input. The image is opened and passed into the predict\_image function. The prediction result is stored in the variable result.

`if `**`name`**` == "`**`main`**`":`

It is used to configure the server route when the API is running.

If you use the code below:

```bash
python -m app
```

If you use the code below:

ngrok will create a public URL endpoint for the API when the server is running. If you use the code below:

```bash
uvicorn app --reload --port=8000 --host=0.0.0.0
```

then the API will run on the local server (localhost).

# Testing

### Run API

```bash
python -m app
```

Using that bash code to run API. Ngrok will generate temporary public url API

Red cycle was a public endpoint url API. copy that url, paste it to Postman App to test out API. don’t forget to add /predict at the end of url to make Classification of input image.

![](/content/case-studies/building-api-for-image-classification-model-using-fast-api/b926d2091a8a.jpg)

### **Input Image**

![](/content/case-studies/building-api-for-image-classification-model-using-fast-api/41ae40e94843.jpg)

Here’s the example of sick fish. so this an fish cat that infected a disease named fungal disease. I Tried to input this image to postman for testing. can this api do the job ? lets see

### Postman Testing

![](/content/case-studies/building-api-for-image-classification-model-using-fast-api/4145f7ab5a9f.jpg)

The API is successfully running optimally. The next step is the DEPLOYMENT phase.
