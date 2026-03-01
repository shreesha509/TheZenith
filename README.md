# 🚀 Autonomous CI/CD Healing Agent  
### Team Zenith | RIFT ’26 Hackathon

## 📌 Overview

The **Autonomous CI/CD Healing Agent** is an AI-powered DevOps automation system built within 24 hours during **RIFT ’26 – Hackathon of Unstop Freedom Festival**, organised by Physics Wallah Institute of Innovation.

This system automatically:

- Clones a GitHub repository
- Detects code failures (Linting, Syntax, Logic, Type, Import, Indentation)
- Generates AI-powered targeted fixes
- Commits fixes with strict formatting
- Pushes to a new branch
- Monitors CI/CD pipeline
- Iterates until all tests pass
- Streams live execution logs to a real-time dashboard

The entire system was developed and deployed end-to-end within the hackathon timeline.

---

## 👨‍💻 Team Zenith

- Shreesha Kumar P  
- Pranith Jain  
- Prakya Kuncham  
- Yashwanth Udupa  

---

## 🏗 System Architecture

### Backend
- FastAPI (Async)
- LangGraph (Multi-Agent Orchestration)
- Celery + Redis (Background Tasks & Pub/Sub)
- Docker Sandbox (Isolated Execution)
- PostgreSQL (Persistent Run Storage)
- Anthropic Claude 3.5 Sonnet (AI Fix Generation)
- GitHub API Integration (Branching & CI Monitoring)

### Frontend
- React
- Real-time WebSocket Streaming
- CI Timeline Visualization
- Fix Tracking Dashboard

---

## 🤖 Multi-Agent Workflow

The system uses a LangGraph-based multi-agent architecture:

1. **Analyzer Agent**
   - Runs pytest, flake8, mypy
   - Detects strict bug categories

2. **Developer Agent**
   - Uses Claude to generate precise fixes
   - Applies structured patch updates

3. **QA Critic Agent**
   - Re-runs tests in Docker sandbox
   - Validates fix correctness

4. **Git Agent**
   - Commits with strict regex format
   - Pushes to `TEAMNAME_LEADERNAME_AI_Fix`
   - Polls GitHub Actions until completion

---

## 📜 Strict Hackathon Compliance

### Branch Naming Format


TEAMNAME_LEADERNAME_AI_Fix


### Commit Message Format


[AI-AGENT] {BUG_TYPE} error in {file} line {N} → Fix: {action}


Supported Bug Types:
- LINTING
- SYNTAX
- LOGIC
- TYPE_ERROR
- IMPORT
- INDENTATION

---

## 🐳 Docker Sandbox

Each repository executes inside an isolated Docker container with:

- 512MB memory limit
- CPU quota restriction
- Controlled file mounting
- Automatic cleanup

---

## ⚙️ Backend Setup

### 1️⃣ Clone Repository

git clone <your_repo_url>
cd backend
2️⃣ Install Dependencies
pip install -r requirements.txt
3️⃣ Set Environment Variables

Linux / Mac:

export ANTHROPIC_API_KEY=your_key
export GITHUB_PAT=your_token
export REDIS_URL=redis://localhost:6379
export DATABASE_URL=postgresql://user:pass@localhost:5432/cicdagent

Windows PowerShell:

$env:ANTHROPIC_API_KEY="your_key"
4️⃣ Start Required Services

Redis:

docker run -p 6379:6379 redis:7-alpine

PostgreSQL:

docker run --name cicd-postgres \
-e POSTGRES_USER=user \
-e POSTGRES_PASSWORD=pass \
-e POSTGRES_DB=cicdagent \
-p 5432:5432 \
-d postgres:15
5️⃣ Run Backend
uvicorn api:app --reload

Start Celery Worker:

celery -A worker worker --loglevel=info
🔌 API Endpoints
Start Agent Run
POST /api/run

Example Request:

{
  "github_url": "https://github.com/user/repo",
  "team_name": "Zenith",
  "leader_name": "Shreesha Kumar",
  "max_iterations": 3
}
Get Results
GET /api/results/{run_id}
WebSocket Streaming
/ws/{run_id}

Streams live execution logs.

📊 Scoring Logic
base = 100
speed_bonus = +10 if execution_time < 5 minutes
efficiency_penalty = 2 × (commits over 20)
final = base + speed_bonus - penalty
📁 Output

Each run generates a results.json containing:

Error summary

Fix details

CI status

Iteration count

Execution time

Score breakdown

Confidence metrics

Stored in:

File system

PostgreSQL database

🏁 Hackathon

RIFT ’26 – Hackathon of Unstop Freedom Festival
Organised by Physics Wallah Institute of Innovation
Conducted across 4 centers in India

📌 Highlights

Built & deployed in 24 hours

Full-stack implementation

Multi-agent AI architecture

Real-time CI/CD automation

Production-grade backend system
