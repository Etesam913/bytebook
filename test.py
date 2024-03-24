
import os
import boto3
import botocore

def fetchFiles():
  client = boto3.client(
     "s3",
      region_name="nyc3",
      endpoint_url="https://nyc3.digitaloceanspaces.com",
      aws_access_key_id="DO003TN4AND3Z8ER44MM",
      aws_secret_access_key="aBfWggcG8a13BtRWZoVYq4nDxnq/tpYLbAE4qTbuedY",
  )


  r = client.list_objects(Bucket="bytebook-test")
  print(r)
  

fetchFiles()
  
