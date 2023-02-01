import pandas as pd
from legoBlocks import *
import json

humans = ['H_OLS', 'H_quad', 'H_PL7']
teachers = ['T_OLS2', 'T_quad3', 'T_PL7', 'T_GreedyConstruction', 'T_HillClimbingRestart']
evaluators = ['E_MSE', 'E_extrema', 'E_MSE_extrema']

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        return json.JSONEncoder.default(self, obj)

def run(filename, human, teacher, evaluator):
	f = os.path.join('data', filename)
	if os.path.isfile(f) and f.endswith('.csv'):
		d = pd.read_csv(f)
		D = {}
		# D['x'] = ((d.iloc[:, 0] - d.iloc[:, 0].min()) / (d.iloc[:, 0].max() - d.iloc[:, 0].min())).to_numpy()
		# D['y'] = ((d.iloc[:, 1] - d.iloc[:, 1].min()) / (d.iloc[:, 1].max() - d.iloc[:, 1].min())).to_numpy()
		D['x'] = d.iloc[:,0].to_numpy()
		D['y'] = d.iloc[:,1].to_numpy()
		D['name'] = filename
	else:
		raise Exception("Invalid filename")

	if (human in humans) and (teacher in teachers) and (evaluator in evaluators):
		pipeline_code = f"Pipeline(human_proxy={human}, teacher={teacher}, evaluator={evaluator})"
		pipeline = eval(pipeline_code)
		sample, _ = pipeline.generate_sample(D)
		model_sample = pipeline.H(sample[0], sample[1])
		y_learned_from_sample = model_sample.predict(D['x'].reshape(-1, 1))   
		score = pipeline.getScore(D, sample)
		json_dump = json.dumps({'sample': sample, 'score': score, 'x': D['x'], 'prediction': y_learned_from_sample}, 
                       cls=NumpyEncoder)
		return json_dump
	else:
		raise Exception("Invalid pipeline component")

