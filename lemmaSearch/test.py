

from nltk.stem import PorterStemmer
from nltk.stem import WordNetLemmatizer
ch = "The greatest glory in living lies not in never falling, but in rising every time we fall."
content = "working at great heights can be mitigated by implementing proper safety measures such as using fall protection equipment, conducting regular safety inspections, providing comprehensive training for employees, and following safety protocols set by regulatory bodies. It is important for employers to prioritize the safety of workers who are exposed to height hazards in order to prevent accidents and injuries. By taking proactive steps to identify and address height safety risks, companies can create a safe working environment and ensure the well-being of their employees."


import re

def sanitize_and_split(text: str) -> list:
    text = text.lower()
    clean = ''.join([char if char.isalpha() or char.isspace() else '' for char in text])
    words = clean.split()
    return words

func = PorterStemmer().stem

lemmatizer = WordNetLemmatizer().lemmatize
print([func(word) for word in sanitize_and_split(content)] )  # Output: greatness
print([func(word) for word in sanitize_and_split(ch)] ) 

        