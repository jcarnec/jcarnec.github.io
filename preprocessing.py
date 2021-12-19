import pandas as pd
import os
from io import StringIO
import json
import csv


f = open("./data/movie_results.csv" ,"r")
i = 0

df = pd.read_csv(f, low_memory=False)
# df.drop(df[df.vote_count <= 3].index, inplace=True)
print(df.groupby('original_language' ).count().to_string())

