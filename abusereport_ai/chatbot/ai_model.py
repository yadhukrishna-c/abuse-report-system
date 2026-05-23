import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

with open("chatbot/training_data.json") as f:
    data=json.load(f)

X=[]
y=[]

for intent,phrases in data.items():
    for p in phrases:
        X.append(p)
        y.append(intent)

vectorizer=TfidfVectorizer()
X_vec=vectorizer.fit_transform(X)

model=LogisticRegression()
model.fit(X_vec,y)

def predict_intent(text):
    text_vec=vectorizer.transform([text])
    intent=model.predict(text_vec)[0]
    return intent