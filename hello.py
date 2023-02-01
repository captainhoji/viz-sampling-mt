from flask import Flask, redirect, url_for, render_template, send_file, request, jsonify
import json
from legoBlocks import *
import pipeline

app = Flask(__name__)

@app.route('/')
def index():
   # Opening JSON file
   with open('datasets.json') as json_file:
      data = json.load(json_file)
      return render_template('index.html', datasets=data['datasets'], humans=pipeline.humans, teachers=pipeline.teachers, evaluators=pipeline.evaluators)

@app.route('/data/<filename>', methods = ['GET'])
def getData(filename):
   try:
      return send_file('data/%s' % filename)
   except Exception as e:
      return str(e)

@app.route('/userData/<filename>', methods = ['GET'])
def getUserData(filename):
   try:
      return send_file('data/%s' % filename)
   except Exception as e:
      return str(e)

@app.route('/pipeline', methods = ['GET'])
def generateSample():
   data = request.args.get('data')
   human = request.args.get('h')
   teacher = request.args.get('t')
   evaluator = request.args.get('e')
   print(f"running: {data}, {human}, {teacher}, {evaluator}")
   try:
      response = pipeline.run(data, human, teacher, evaluator)
      return response
   except Exception as e:
      print(e)


@app.route('/favicon.ico', methods = ['GET'])
def getFavicon():
   return send_file('static/favicon_io/favicon.ico')

if __name__ == '__main__':
   app.debug = True
   app.run()