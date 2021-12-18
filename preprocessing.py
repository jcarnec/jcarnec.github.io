import pandas as pd
import os
from io import StringIO
import json
import csv

directory = './data/movies_tmdbMeta.csv'

f = open("./data/movie_results.csv" ,"w+")
i = 0

with open(directory, 'r', encoding='utf-8') as csvfile:
     df = pd.read_csv(directory, low_memory=False)
     df.drop(df[df.vote_count <= 3].index, inplace=True)
     df.to_csv(f)

