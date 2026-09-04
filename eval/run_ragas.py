import json
import os
import time
import requests
from dotenv import load_dotenv
from ragas import EvaluationDataset, evaluate
from ragas.llms import LangchainLLMWrapper
from ragas.metrics import Faithfulness, LLMContextRecall, FactualCorrectness
from ragas.run_config import RunConfig
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv(".env.local")

API_URL = "http://localhost:3000/api/rag"

with open("eval/qa_set.json") as f:
    qa_set = json.load(f)

records = []

for item in qa_set:
    print(f"Querying: {item['question']}")
    resp = requests.post(API_URL, json={"question": item["question"]})
    time.sleep(8)
    data = resp.json()
    records.append({
        "user_input": item["question"],
        "retrieved_contexts": data.get("contexts", []),
        "response": data.get("answer", ""),
        "reference": item["ground_truth"],
    })

dataset = EvaluationDataset.from_list(records)

gemini_key = os.environ["GEMINI_API_KEY"]
llm = ChatGoogleGenerativeAI(model="gemini-3.1-flash-lite", google_api_key=gemini_key)
evaluator_llm = LangchainLLMWrapper(llm)

result = evaluate(
    dataset=dataset,
    metrics=[Faithfulness(), LLMContextRecall(), FactualCorrectness()],
    llm=evaluator_llm,
    run_config=RunConfig(max_workers=2, timeout=180),
)

print(result)
result.to_pandas().to_csv("eval/ragas_results.csv", index=False)
print("Saved to eval/ragas_results.csv")