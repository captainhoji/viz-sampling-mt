from abc import ABC, abstractmethod
import matplotlib.pyplot as plt
import matplotlib
import math
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import PolynomialFeatures
from sklearn.base import BaseEstimator, RegressorMixin
import random
import os

class IHumanProxy(ABC):
    
    @abstractmethod
    def fit(self, x, y):
        pass

    @abstractmethod
    def predict(self, x):
        pass

class Pipeline:
    """
    H: human proxy. Has fit(x, y), predict(x)
    T: teacher.
    evaluator: evaluates sample w.r.t original data.
    """
    def __init__(self, human_proxy, teacher, evaluator):
        # if not isinstance(human_proxy, IHumanProxy): raise Exception('Bad interface')
        self.H = human_proxy
        self.T = teacher
        self.E = evaluator

    def generate_sample(self, D):
        return self.T(D, self.H, self.E)

    def getScore(self, D, sample):
        return self.E(D, self.H(sample[0], sample[1]))

    def generate_plots(self, DD, comparison=True):
        f = plt.figure()
        f.set_figwidth(25)
        f.set_figheight((int(len(DD)/6) + 1)*4)

        for i in range(len(DD)):
            D = DD[i]
            x = D['x'].reshape(-1, 1)
            y = D['y']

            sample, _ = self.generate_sample(D)
            # print(f"{D['name']}: sample_x = {sample[0]}")
            # print(f"{D['name']}: sample_y = {sample[1]}")
            model_sample = self.H(sample[0], sample[1])
            y_learned_from_sample = model_sample.predict(x)          
            distance = self.E(D, model_sample)


            plt.subplot(int(len(DD)/6) + 1, 6, (i+1))
            plt.title(f"{D['name']}")
            plt.xlabel("distance = %.5f" % distance)

            plt.plot(x,y)
            plt.plot(x,y_learned_from_sample)
            if comparison:
                model_raw = self.H(x, y)
                y_learned_from_raw = model_raw.predict(x)
                plt.plot(x,y_learned_from_raw)
            plt.plot(sample[0], sample[1], 'ro')

            plt.axis('off')
        plt.subplots_adjust(hspace=0.25)
        plt.show()

def E_MSE(D, model):
    x = D['x'].reshape(-1, 1)
    y = D['y']
    y_predicted = model.predict(x)
    return mean_squared_error(y, y_predicted)

class H_OLS(IHumanProxy):
    def __init__(self, x, y):
        self.model = LinearRegression()
        self.fit(x, y)
        
    def fit(self, x, y):
        x = np.array(x).reshape(-1,1)
        self.model.fit(x, y)

    def predict(self, x):
        x = np.array(x).reshape(-1,1)
        return self.model.predict(x)

"""
Assumes: H is a oridnary least squares learner
Outputs: sample of size 2
Note: This teacher does not use actual H and E in the pipeline (White-Box)
"""
def T_OLS2(D, H, evaluator):
    x = D['x'].reshape(-1, 1)
    y = D['y']
    minDist = math.inf
    minS = [[],[]]
    h_tilde = LinearRegression()
    for i in range(len(x)):
        for j in range(i+1, len(x)):
            if i==j: continue
            x_sample = np.array([x[i], x[j]]).reshape(-1, 1)
            y_sample = np.array([y[i], y[j]])
            model = h_tilde.fit(x_sample, y_sample)
            y_predicted = h_tilde.predict(x)
            distance = mean_squared_error(y, y_predicted)
            if (distance < minDist):
                minDist = distance
                minS[0] = x_sample
                minS[1] = y_sample
    return minS, minDist

class H_quad(IHumanProxy):
    def __init__(self, x, y):
        self.poly = PolynomialFeatures(degree=2, include_bias=False)
        self.model = LinearRegression()
        self.fit(x, y)
        
    def fit(self, x, y):
        x = np.array(x).reshape(-1,1)
        x = self.poly.fit_transform(x)
        self.model.fit(x, y)

    def predict(self, x):
        x = np.array(x).reshape(-1,1)
        return self.model.predict(self.poly.fit_transform(x))

def T_quad3(D, H, evaluator):
    x = D['x'].reshape(-1, 1)
    y = D['y']
    minDist = math.inf
    minS = [[],[]]
    poly = PolynomialFeatures(degree=2, include_bias=True)
    for i in range(len(x)):
        for j in range(i+1, len(x)):
            for k in range(j+1, len(x)):
                x_sample = np.array([x[i], x[j], x[k]])
                y_sample = np.array([y[i], y[j], y[k]])
                # h_tilde.fit(poly.fit_transform(x_sample), y_sample)
                h_tilde = H_quad(x_sample, y_sample)
                y_predicted = h_tilde.predict(x)
                distance = mean_squared_error(y, y_predicted)
                if (distance < minDist):
                    minDist = distance
                    minS[0] = x_sample
                    minS[1] = y_sample
    return minS, minDist

#Piecewise Linear "connect the dots" learner
class H_PL(IHumanProxy):
    def __init__(self, x, y):
        self.fit(x, y)
        
    def fit(self, X, y):
        self.X = X
        self.y = y
    
    def predict(self, dX):
        dy = np.ones(len(dX))
        if len(self.X) == 1:
            return dy * self.y[0]
        for i in range(len(dX)):
            dx = dX[i]
            x1 = 0
            x2 = 0
            k = len(self.X)
            for j in range(len(self.X)):
                if dx < self.X[j]:
                    k = j
                    break
            if k == 0:
                x1 = 0
                x2 = 1
            elif k == len(self.X):
                x1 = len(self.X) - 2
                x2 = len(self.X) - 1
            else:
                x1 = k - 1
                x2 = k
            
            denom = (self.X[x2] - self.X[x1]) * (dx - self.X[x1])
            if (denom == 0):
                dy[i] = self.y[x1]
            else:
                dy[i] = self.y[x1] + (self.y[x2] - self.y[x1]) / (self.X[x2] - self.X[x1]) * (dx - self.X[x1])       
        return dy

class H_PL7(H_PL):
    def __init__(self, X, y):
        self.fit(X, y)
        
    def fit(self, X, y):
        if (len(X) > 7):
            self.X = X[len(X)-7:]
            self.y = y[len(y)-7:]
        else:
            self.X = X
            self.y = y
    
    def predict(self, dX):
        return super().predict(dX)

def T_PL(D, n, evaluator):
    x = D['x'].reshape(-1, 1)
    y = D['y']
    did = D['name']
    if n==2:
        return T(x, y)
    minDist = math.inf
    minx0 = -1
    minx1 = -1
    recnp = np.ones([len(x), len(x)]) * -1
    recdist = np.ones([len(x), len(x)]) * -1
    recnp_path = "storage/recnp%s.npy" % (did)
    recdist_path = "storage/recdist%s.npy" % (did)
    if os.path.isfile(recnp_path) and os.path.isfile(recdist_path):
        recnp = np.load(recnp_path) #load from disk
        recdist = np.load(recdist_path) #load from disk
        # if recnp[prevx][n] != -1:
        #     return recnp[prevx][n], recdist[prevx][n]
    
    for i in range(len(x)):
        for j in range(i + 1, len(x)):
            xcut = x[0:(j+1)]
            ycut = y[0:(j+1)]
            x_sample = np.array([x[i], x[j]])
            y_sample = np.array([y[i], y[j]])
            model = LinearRegression().fit(x_sample, y_sample)
            ycut_predicted = model.predict(xcut)
            distance = mean_squared_error(ycut, ycut_predicted)
            fx, fdist = T_PLRecursion(x, y, j, n-2, recnp, recdist)
            distance += fdist
            if distance < minDist:
                minDist = distance
                minx0 = i
                minx1 = j
    
    minSx = [x[minx0], x[minx1]]
    minSy = [y[minx0], y[minx1]]
    k = minx1
    for i in range(n-2):
        k = int(recnp[k][n-2-i])
        minSx.append(x[k])
        minSy.append(y[k])
    
    np.save("storage/recnp%s.npy" % (did),recnp) # save to disk
    np.save("storage/recdist%s.npy" % (did), recdist) # save to disk
    return [minSx, minSy], minDist

# returns array of size n, containing indexes of x that results in min distance 
def T_PLRecursion(x, y, prevx, n, recnp, recdist):
    if n == 0: return -1, 0
    if recnp[prevx][n] != -1:
        return recnp[prevx][n], recdist[prevx][n]
    minDist = math.inf
    minSx = 0
    xcut, ycut = [], []
    for i in range(prevx + 1, len(x)):
        if n == 1:
            xcut = x[prevx+1:len(x)]
            ycut = y[prevx+1:len(x)]
        else:
            xcut = x[prevx+1:(i+1)]
            ycut = y[prevx+1:(i+1)]
        x_sample = [x[prevx], x[i]]
        y_sample = [y[prevx], y[i]]
        model = LinearRegression().fit(x_sample, y_sample)
        ycut_predicted = model.predict(xcut)
        distance = mean_squared_error(ycut, ycut_predicted)
        fx, fdist = T_PLRecursion(x, y, i, n-1, recnp, recdist)
        distance += fdist
        if distance < minDist:
            minDist = distance
            minSx = i
    
    recdist[prevx][n] = minDist
    recnp[prevx][n] = minSx  
    return minSx, minDist

def T_PL7(D, H, evaluator):
    return T_PL(D, 7, evaluator)

def T_GreedyConstruction(D, H, evaluator):
    x = D['x']
    y = D['y']
    did = D['name']
    x_sample_min = []
    y_sample_min = []
    minDist = math.inf
    distance = math.inf
    index = 0

    pool = set(range(len(x)))

    while True:
        x_sample_min = np.append(x_sample_min, 0)
        y_sample_min = np.append(y_sample_min, 0)
        for i in pool:
            x_sample_min[len(x_sample_min)-1] = x[i]
            y_sample_min[len(y_sample_min)-1] = y[i]
            x_sample_sorted = [x for x,_ in sorted(zip(x_sample_min,y_sample_min))]
            y_sample_sorted = [x for _,x in sorted(zip(x_sample_min,y_sample_min))]
            human = H(x_sample_sorted, y_sample_sorted)
            distance_curr = evaluator(D, human)
            if (distance_curr < distance):
                distance = distance_curr
                index = i
        if (distance >= minDist):
            x_sample_min = np.delete(x_sample_min,-1)
            y_sample_min = np.delete(y_sample_min,-1)
            break
        minDist = distance
        distance = math.inf
        x_sample_min[len(x_sample_min)-1] = x[index]
        y_sample_min[len(y_sample_min)-1] = y[index]
        pool.remove(index)

    x_sample_sorted = [x for x,_ in sorted(zip(x_sample_min,y_sample_min))]
    y_sample_sorted = [x for _,x in sorted(zip(x_sample_min,y_sample_min))]

    return [x_sample_sorted, y_sample_sorted], minDist

def T_HillClimbing(D, H, evaluator):
    x = D['x']
    y = D['y']
    did = D['name']
    table = {}
    for i in range(len(x)):
        table[x[i]] = y[i]
        
    sample, minDist = T_GreedyConstruction(D, H, evaluator)
    x_sample = sample[0]
    y_sample = sample[1]
    x_sample_min = x_sample
    y_sample_min = y_sample
        
    x_pool = x
    for sx in range(len(x_sample)):
        x_pool = x_pool[x_pool != sx]
        
    distance = math.inf
    index = 0
    tries = 0
    while tries < 100:
        x_temp = x_sample
        y_temp = y_sample

        rng = random.random()
        x_added = -1
        x_removed = -1
        # add one element or remove one element or change one element
        if rng < 1/3 or rng > 2/3:
            x_added = x_pool[int(random.random()*len(x_pool))]
            x_pool = x_pool[x_pool != x_added]
            x_temp = np.append(x_temp, x_added)
            y_temp = np.append(y_temp, table[x_added])
        if 1/3 < rng and len(x_sample) > 2:
            x_removed = x_sample[int(random.random()*len(x_sample))]
            x_temp = np.delete(x_temp, np.argwhere(x_temp == x_removed))
            y_temp = np.delete(y_temp, np.argwhere(y_temp == table[x_removed]))
            x_pool = np.append(x_pool, x_removed)


        x_temp_sorted = [i for i,_ in sorted(zip(x_temp,y_temp))]
        y_temp_sorted = [j for _,j in sorted(zip(x_temp,y_temp))]

        human = H(x_temp_sorted, y_temp_sorted)
        distance_curr = evaluator(D, human)
        if (distance_curr < minDist):
            minDist = distance_curr
            x_sample = x_temp_sorted
            y_sample = y_temp_sorted
            tries = 0
        else:
            if x_added != -1:
                x_pool = np.append(x_pool, x_added)
            if x_removed != -1:
                x_pool = x_pool[x_pool != x_removed]
            tries += 1
    return [x_sample, y_sample], minDist

def T_HillClimbingRestart(D, H, evaluator):
    x = D['x']
    y = D['y']
    did = D['name']
    table = {}
    for i in range(len(x)):
        table[x[i]] = y[i]
        
    x_sample_min = None
    y_sample_min = None

    minDistGlobal = math.inf
    for k in range(100):
        x_sample = []
        y_sample = []
        
        for u in range(len(x)):
            index_sample = random.sample(range(len(x)), 7)
            x_sample = x[index_sample]
            y_sample = y[index_sample]
        minDist = math.inf
        x_pool = x
        for sx in range(len(x_sample)):
            x_pool = x_pool[x_pool != sx]
        tries = 0
        while tries < 100:
            x_temp = x_sample
            y_temp = y_sample

            rng = random.random()
            x_added = -1
            x_removed = -1
            # add one element or remove one element or change one element
            if rng < 1/3 or rng > 2/3:
                x_added = x_pool[int(random.random()*len(x_pool))]
                x_pool = x_pool[x_pool != x_added]
                x_temp = np.append(x_temp, x_added)
                y_temp = np.append(y_temp, table[x_added])
            if 1/3 < rng and len(x_sample) > 2:
                x_removed = x_sample[int(random.random()*len(x_sample))]
                x_temp = np.delete(x_temp, np.argwhere(x_temp == x_removed))
                y_temp = np.delete(y_temp, np.argwhere(y_temp == table[x_removed]))
                x_pool = np.append(x_pool, x_removed)

            sample_sorted = sorted(zip(x_temp,y_temp))
            x_temp_sorted = [i for i,_ in sample_sorted]
            y_temp_sorted = [j for _,j in sample_sorted]

            human = H(x_temp_sorted, y_temp_sorted)
            distance_curr = evaluator(D, human)
            if (distance_curr < minDist):
                minDist = distance_curr
                x_sample = x_temp_sorted
                y_sample = y_temp_sorted
                tries = 0
            else:
                if x_added != -1:
                    x_pool = np.append(x_pool, x_added)
                if x_removed != -1:
                    x_pool = x_pool[x_pool != x_removed]
                tries += 1
        if minDist < minDistGlobal:
            minDistGlobal = minDist
            x_sample_min = x_sample
            y_sample_min = y_sample

    return [x_sample_min, y_sample_min], minDistGlobal

def E_extrema(D, model):
    x = D['x'].reshape(-1, 1)
    y = D['y']
    y_predicted = model.predict(x)
    return (y.max() - y_predicted.max()) ** 2 + (y.min() - y_predicted.min()) ** 2

def E_MSE_extrema(D, model):
    x = D['x'].reshape(-1, 1)
    y = D['y']
    y_predicted = model.predict(x)
    return E_MSE(D, model) + 10 * ((y.max() - y_predicted.max()) ** 2 + (y.min() - y_predicted.min()) ** 2)