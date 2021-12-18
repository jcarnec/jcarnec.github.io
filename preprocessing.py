import pandas
import os
from io import StringIO
import json

directory = '../movies/movies/'

f = open("movie_results.csv" ,"a+")
i = 0

for filename in os.listdir(directory):
     with open(directory + filename, 'r', encoding='utf-8') as file:
          first = False
          json_result = json.load(file)
          df = pandas.DataFrame.from_dict(json_result, orient='index').T.set_index('id')
          columns = len( list(df.items()))
          if (columns != 24):
               print("error", columns)
               break
          if (i == 0):
               f.write(df.to_csv(sep=',', encoding='utf-8', header='true'))
          else:
               f.write(df.to_csv(sep=',', encoding='utf-8', header=False))
          i += 1
          print(i)

