# MindSpace - Your Mental Wellness Companion

MindSpace is a full-stack web application designed to be a safe and anonymous space for users to monitor their mental well-being. It features mood tracking, guided self-assessments, an empathetic AI chatbot, and a dashboard to visualize progress over time.



## Features

- **User Authentication**: Secure registration and login system.
- **Dashboard**: A central hub to view mood timelines, recent entries, and assessment score history.
- **Mood Tracking**: Daily mood check-ins with optional notes.
- **Self-Assessments**:
  - Anxiety Screening (GAD-7)
  - Depression Screening (PHQ-9)
  - Stress Assessment
- **Historical Charts**: Visualizes mood and assessment scores over time to track trends.
- **AI Chatbot**: An empathetic chatbot powered by OpenAI for supportive conversations, with guardrails to stay on topic.
- **Wellness Activities**: Guided activities like breathing exercises to help users relax.
- **Resource Library**: Curated links to external mental health resources.

##  Tech Stack

- **Frontend**:
  - [Next.js](https://nextjs.org/) (React Framework)
  - [TypeScript](https://www.typescriptlang.org/)
  - [Tailwind CSS](https://tailwindcss.com/)
  - [shadcn/ui](https://ui.shadcn.com/) (Component Library)
  - [Chart.js](https://www.chartjs.org/) & [react-chartjs-2](https://react-chartjs-2.js.org/) (Data Visualization)
  - [Lucide React](https://lucide.dev/) (Icons)

- **Backend**:
  - [Python](https://www.python.org/)
  - [Flask](https://flask.palletsprojects.com/) (Web Framework)
  - [SQLAlchemy](https://www.sqlalchemy.org/) (ORM)
  - [OpenAI API](https://platform.openai.com/) (For the AI Chatbot)
  - [Groq API](https://console.groq.com/keys/) (For the AI Chatbot)

- **Database**:
  - [MySQL]
  - [MongoDBAtlas]
  - [ChromaDB]

## 📋 Prerequisites

- [Node.js](https://nodejs.org/en/) (v18.x or later)
- [Python](https://www.python.org/downloads/) (v3.8 or later) and `pip`

##  Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### 1. Clone the Repository

```bash
git clone https://github.com/sadhana6299/MindSpace.git
cd MindSpace
```

### 2. Backend Setup

The backend server runs on Flask and handles API requests, database interactions, and communication with the OpenAI API.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
# On Windows
python -m venv venv
.\venv\Scripts\activate
# On macOS/Linux
python3 -m venv venv
source venv/bin/activate

# Install the required Python packages
pip install -r requirements.txt

# Create a .env file in the project root (the parent directory of 'backend')
# and add your API keys.
# The file should be located at 'MentalHealthAgent/.env'
touch ../.env
```

```bash
# Initialize and apply database migrations
# (Make sure you are still in the 'backend' directory)
cd backend

python app.py

# Start the Flask server (it will run on http://localhost:5000)

```

### 3. Frontend Setup

The frontend is a Next.js application. Open a **new terminal** for these steps.

```bash
# Navigate to the project root directory
cd MindSpace

# Install the required npm packages
npm install

# Start the development server (it will run on http://localhost:3000)
npm run dev
```

Open http://localhost:3000 in your browser to see the application.

##  Running for Production

To create a production-optimized build of the frontend:

```bash
# Create the production build
npm run build

# Start the production server
npm start
```
