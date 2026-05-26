# ML Process Prioritizer

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Active-success)

## 📖 Overview

**ML Process Prioritizer** is an intelligent process scheduling system that leverages Machine Learning to optimize CPU allocation. Unlike traditional scheduling algorithms (like Round Robin or FCFS) that rely on static metrics, this project uses **[Random Forest / Neural Networks]** to predict process behavior and dynamically assign priorities.

Traditional schedulers often suffer from the "starvation" problem or inefficiency due to unknown CPU burst times. This project solves that by predicting burst times based on historical process attributes. It also increases Priority of processes in waiting queue over time i.e Aging so they don't starve.

## ✨ Key Features

- **Predictive Scheduling:** Estimates CPU burst time for incoming processes using a pre-trained ML model.
- **Dynamic Priority Assignment:** Automatically adjusts process priority based on predicted resource usage.
- **Simulation Environment:** Includes a simulation script to compare ML-based scheduling against standard algorithms (SJF, Round Robin).
- **Performance Metrics:** Visualizes improvements in **Wait Time**, **Turnaround Time**, and **CPU Utilization**.

## 🛠️ Tech Stack

- **Language:** Python 3.x
- **ML Libraries:** Scikit-learn, Pandas, NumPy, TensorFlow/PyTorch (if applicable)
- **Visualization:** Matplotlib / Seaborn

## 🚀 Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/HirdyanshuSinghChanaria/ML-Process-Prioritizer.git](https://github.com/HirdyanshuSinghChanaria/ML-Process-Prioritizer.git)
   cd ML-Process-Prioritizer
