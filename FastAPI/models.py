#creating table for SQL database
from database import Base
from sqlalchemy import Column, Integer, String, Boolean, Float


class Transaction(Base):
    __tablename__ = 'Dados do Paciente'

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String)
    idade = Column(Float)
    sexo = Column(String)
    data = Column(String)