---
title: "How to handle imbalanced data for maximize Machine Learning model"
slug: "how-to-handle-imbalaced-data"
summary: "Handle imbalanced data to fight bias model"
date: "2024-05-22"
role: ""
tags:
featured: false
notionId: "fa62a05d-3d70-45f8-bf1c-0a3c7f270271"
notionLastEdited: "2026-11-28T10:41:00.000Z"
---

### For Indonesian Version

[medium.com](https://medium.com/@budihafiz46_75661/cara-menghandle-data-imbalance-untuk-memaksimalkan-kerja-model-machine-learning-e0e4c6429f59)

# **Project Overview**

### Introduction

Balancing data is an important step in the process of building machine learning and deep learning models. It refers to the effort to ensure that the number of samples from each class in the dataset is balanced or at least not overly skewed. Data imbalance can occur when one or more classes have significantly fewer samples compared to others. This situation can significantly impact the performance and accuracy of the developed model.

Here are several reasons why balancing data is important:

1. **Avoiding Model Bias:** Machine learning models tend to optimize their performance for the majority class if there is significant data imbalance. This means the model may learn to focus more on the majority class, ignoring the minority class which might be equally important.
2. **Improving Accuracy on Minority Classes:** With balanced data, the model will have a better chance to learn and recognize patterns from the minority class. This is especially important in applications where predictions on the minority class are critical, such as fraud detection, medical diagnosis, or predictive maintenance.
3. **Reducing Overfitting:** Data imbalance can lead to overfitting on the majority class because the model might become too specific to the samples from that class. By balancing the data, the model tends to be more general and able to generalize well on new data.
4. **Enhancing Model Accuracy and Fairness:** In applications that require fair and accurate predictions across all classes, such as recommendation systems or credit scoring applications, data balancing is crucial. It ensures that all users or entities are treated fairly by the model.
5. **Improving Evaluation Methods:** In imbalanced data conditions, evaluation metrics such as accuracy can provide a misleading picture of model performance. A model may show high accuracy because it predicts the majority class well, while its performance on the minority class is poor. With balanced data, evaluation metrics like F1-score, precision, and recall will provide a more accurate depiction of the model's performance on each class.

### Tools and Library

- Imbalanced learn
- Pandas
- Google collab

# The Approach and Process

### **Dataset **

```python
df.head()
```

![](/content/case-studies/how-to-handle-imbalaced-data/1a74e6ed8213.png)

The dataset being used is for diabetes classification, containing 8 features and 1 label (classification). Previously, this dataset has undergone preprocessing steps such as feature engineering and data cleaning.

### Check Imbalanced data

```python
df['Klasifikasi'].value_counts()
```

![](/content/case-studies/how-to-handle-imbalaced-data/99c5e82dbd99.png)

There are 2 classes: 0 (no diabetes) and 1 (diabetes). The number of samples in class 0 (no diabetes) is 91,500, whereas in class 1 (diabetes) it is 8,500. This disparity is significant. If left unaddressed, the predictions will likely be biased towards class 1 (no diabetes). This is dangerous because this dataset will be used for a machine learning model to predict diabetes. It is crucial to avoid producing diagnostic errors.

### Split Data

```python
X = df.drop(columns=['Klasifikasi'])
y = df['Klasifikasi']
```

Split the dataset into two variables: variable X as the training data and y as the target label.

### Balancing data menggunakan teknik Oversampling

```python
from imblearn.over_sampling import SMOTENC
categorical_columns = ['hypertension', 'heart_disease','smoking_history','gender']
categorical_indices = [X.columns.get_loc(col) for col in categorical_columns]
smote_nc = SMOTENC(categorical_features=categorical_indices,sampling_strategy='auto')
X_resampled, y_resampled = smote_nc.fit_resample(X, y)
```

Oversampling is the act of increasing the number of data intended for the class with fewer samples, in this case, class 1 (diabetes). Oversampling is done by synthesizing new data based on the training data.

The reason for using the SMOTENC library is that the features in this dataset have 2 data types: categorical and numeric.

Here are the details of how SMOTENC creates new synthetic samples:

- Numeric Features: For numeric features, SMOTENC performs linear interpolation between selected minority samples and one of their neighbors. This means that the numeric features of synthetic samples are a linear combination of the numeric features of two existing samples.
- Categorical Features: For categorical features, SMOTENC selects category values based on the category distribution of the nearest neighbors. The category values for synthetic features are randomly chosen from the category values held by the nearest neighbors.

### Check data distribution

```python
from collections import Counter
print(Counter(y_resampled))
```

![](/content/case-studies/how-to-handle-imbalaced-data/e2060c14be12.png)

The classification class (as the target label) is already balanced between class 0 and 1, with 91,500 instances each. With this balance, the prediction model won't introduce bias and can predict in a more general manner.
