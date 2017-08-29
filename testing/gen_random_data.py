import random 
import string
import sys

def randomName():
    N = 10
    return ''.join(random.choice(string.ascii_uppercase) for _ in range(N))

def genRandom(number):
    for i in range(1,number+1):
        print("CREATE ("+str(i)+":Person {name: \""+randomName()+"\"})-[:likes]->("+str(i+1)+":Person {name:\""+randomName()+"\"});")

if __name__ == "__main__":
    if (len(sys.argv) == 3):
        count = int(sys.argv[2])
    genRandom(count)


