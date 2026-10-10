import pandas as pd
import json
import sys
from pathlib import Path
import subprocess

# Add parent directory to path so we can import backend
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

from backend.decision import decide
from backend.data_loader import DATA_DIR

def run_predictions(input_csv: Path, output_jsonl: Path):
    if not input_csv.exists():
        print(f"File {input_csv} not found, skipping.")
        return
        
    df = pd.read_csv(input_csv)
    output_jsonl.parent.mkdir(parents=True, exist_ok=True)
    
    results = []
    for _, row in df.iterrows():
        scenario = row.to_dict()
        try:
            res = decide(scenario)
            results.append(res)
        except Exception as e:
            print(f"Error on scenario {scenario['id']}: {e}")
            results.append({"scenario_id": scenario['id'], "action": "skip", "reason": f"Error: {e}"})
            
    with open(output_jsonl, 'w', encoding='utf-8') as f:
        for r in results:
            f.write(json.dumps(r) + '\n')
            
    print(f"Wrote {len(results)} predictions to {output_jsonl}")

if __name__ == "__main__":
    public_csv = DATA_DIR / 'scenarios_public.csv'
    holdout_csv = project_root / 'eval' / 'scenarios_holdout_blind.csv'
    
    out_dir = project_root / 'outputs'
    out_dir.mkdir(exist_ok=True)
    
    public_out = out_dir / 'public_predictions.jsonl'
    run_predictions(public_csv, public_out)
    
    holdout_out = out_dir / 'holdout_blind_predictions.jsonl'
    run_predictions(holdout_csv, holdout_out)
    
    print("\nRunning evaluator on public scenarios...")
    eval_script = project_root / 'eval' / 'evaluator.py'
    if eval_script.exists():
        cmd = [
            sys.executable, str(eval_script), 
            "--submission", str(public_out),
            "--scenarios", str(public_csv),
            "--merchants", str(DATA_DIR / 'merchants.csv'),
            "--customers", str(DATA_DIR / 'customers.csv')
        ]
        try:
            subprocess.run(cmd, check=True)
        except subprocess.CalledProcessError as e:
            print(f"Evaluator failed with exit code {e.returncode}")
