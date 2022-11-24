from pandas import *
import csv
import math
 
STIMULINAME = "s4";
XCOL = "Year";
YCOL = "GDP per capita";

def PerpendicularDistance(p0, p1, p2):
    a = (p1[1]-p0[1])/(p1[0]-p0[0])
    b = -1
    c = p0[1] - a * p0[0]

    return math.fabs((a * p2[0] + b * p2[1] + c)) / (math.sqrt(a * a + b * b));

def DouglasPeucker(PointList, epsilon):
    # Find the point with the maximum distance
    dmax = 0
    index = 0
    end = len(PointList)-1
    for i in range(1, end): 
        d = PerpendicularDistance(PointList[i], PointList[0], PointList[end]) 
        if (d > dmax):
            index = i
            dmax = d

    ResultList = []

    # If max distance is greater than epsilon, recursively simplify
    if (dmax > epsilon):
        # Recursive call
        recResults1 = DouglasPeucker(PointList[:(index+1)], epsilon)
        recResults2 = DouglasPeucker(PointList[index:], epsilon)

        # Build the result list
        ResultList = recResults1[:(len(recResults1)-1)] + recResults2
    else:
        ResultList = [PointList[0], PointList[end]]
    # Return the result
    return ResultList

# reading CSV file
data = read_csv(STIMULINAME + ".csv")
 
# converting column data to list
xValues = data[XCOL].tolist()
yValues = data[YCOL].tolist()
dataList = tuple(zip(xValues, yValues)) 

epsilon = 10
epsilon_dict = set()
epsilon_dict.add(epsilon)
lr = 1;

sampledList = DouglasPeucker(dataList, epsilon)
compressionRate = len(sampledList) / len(dataList)

while (compressionRate <= 0.48 or 0.52 <= compressionRate):
    if (compressionRate <= 0.48):
        epsilon -= lr;
    else:
        epsilon += lr;
    sampledList = DouglasPeucker(dataList, epsilon)
    compressionRate = len(sampledList) / len(dataList)
    if epsilon in epsilon_dict:
        lr /= 10
    else:
        epsilon_dict.add(epsilon)
    print('epsilon: ' + str(epsilon))
    print('compressionRate:' + str(compressionRate))

print(sampledList)

with open(STIMULINAME + '-sampled.csv','w') as out:
    csv_out=csv.writer(out)
    csv_out.writerow([XCOL, YCOL])
    for row in sampledList:
        csv_out.writerow(row)

