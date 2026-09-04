import pandas as pd

df = pd.read_csv("eval/ragas_results.csv")
low = df.sort_values("factual_correctness(mode=f1)").head(8)

for _, row in low.iterrows():
    print("Q:", row["user_input"])
    print("Reference:", row["reference"])
    print("Response:", row["response"])
    print("Score:", row["factual_correctness(mode=f1)"])
    print("---")