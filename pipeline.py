import pandas as pd
from legoBlocks import *
import random
import os

humans = ['H_OLS', 'H_quad', 'H_PL7']
teachers = ['T_OLS2', 'T_quad3', 'T_PL7', 'T_HillClimbingRestart']
evaluators = ['E_MSE', 'E_extrema', 'E_MSE_extrema']

def run(filename, human, teacher, evaluator):
	f = os.path.join('data', filename)
	if os.path.isfile(f) and f.endswith('.csv'):
		d = pd.read_csv(f)
		D = {}
		D['x'] = ((d.iloc[:, 0] - d.iloc[:, 0].min()) / (d.iloc[:, 0].max() - d.iloc[:, 0].min())).to_numpy()
		D['y'] = ((d.iloc[:, 1] - d.iloc[:, 1].min()) / (d.iloc[:, 1].max() - d.iloc[:, 1].min())).to_numpy()
		D['name'] = filename
	else:
		raise Exception("Invalid filename")

	if (human in humans) and (teacher in teachers) and (evaluator in evaluators):
		pipeline_code = f"pipeline = Pipeline(human_proxy=\'{human}\', teacher=\'{teacher}\',evaluator=\'{evaluator}\')"
		exec(pipeline_code)
		sample, score = pipeline.generate_sample(D)
		return sample, score
	else:
		raise Exception("Invalid pipeline component")