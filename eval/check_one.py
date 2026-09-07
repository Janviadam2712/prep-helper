import pandas as pd

df = pd.read_csv("eval/ragas_results.csv")

target_question = "Which adsorbents are used in adsorption chromatography?"
row = df[df["user_input"] == target_question].iloc[0]

print("QUESTION:")
print(row["user_input"])
print()
print("RETRIEVED CONTEXT (what your RAG pulled from the PDFs):")
print(row["retrieved_contexts"])
print()
print("EXPECTED ANSWER:")
print(row["reference"])
print()
print("WHAT YOUR RAG ANSWERED:")
print(row["response"])