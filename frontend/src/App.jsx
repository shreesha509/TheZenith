import React, { useState, useEffect, useRef } from 'react';
import {
    AGENTS,
    AGENT_MESSAGES,
    DEBRIEF_PASSED,
    DEBRIEF_FAILED,
    randomFrom,
    randomInt,
    generateSHA,
    generateFix,
    generateTimelineItem,
    interpolateMessage,
} from './services/simulation';
import DecryptedText from './components/DecryptedText';
import Plasma from './components/Plasma';
import CodeRain from './components/CodeRain';
import Particles from './components/Particles';
import CyberFlow from './components/CyberFlow';
import CustomCursor from './components/CustomCursor';
import NeuralNexus from './components/NeuralNexus';

export default function App() {
    // Navigation State
    const [screen, setScreen] = useState('landing'); // landing, dashboard
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [repoUrl, setRepoUrl] = useState('');
    const [teamName, setTeamName] = useState('');
    const [teamLeader, setTeamLeader] = useState('');
    const [maxIterations, setMaxIterations] = useState(5);
    const [targetBranch, setTargetBranch] = useState('');
    const [isValid, setIsValid] = useState(false);

    // Simulation State
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState(null);
    const [thoughtLines, setThoughtLines] = useState([]);
    const [currentAgent, setCurrentAgent] = useState('orchestrator');
    const [fixes, setFixes] = useState([]);
    const [timer, setTimer] = useState(0);
    const [ciStatus, setCiStatus] = useState('RUNNING');
    const [jobId, setJobId] = useState(null);
    const [healthScores, setHealthScores] = useState({ before: 0, after: 0 });
    const [metrics, setMetrics] = useState({ test: 0, lint: 0, type: 0, imports: 0 });
    const [timeline, setTimeline] = useState([]);
    const [currentIteration, setCurrentIteration] = useState(1);
    const [debrief, setDebrief] = useState('');

    const [landingTermText, setLandingTermText] = useState('');
    const [landingTermLines, setLandingTermLines] = useState([]);

    const timerRef = useRef(null);
    const terminalRef = useRef(null);
    const timeoutsRef = useRef([]);

    const landingLines = [
        'Running multi-agent pipeline...',
        'Analyzing repository dependencies...',
        'Found 14 linting errors and 3 circular imports.',
        'Applying Fixer Agent strategy: BREAK_CIRCULAR_DEP',
        'Commit pushed: rift/heal-main branch',
        'Triggering verification CI run...',
        'All checks passed. System ready.'
    ];

    // Validate Form
    useEffect(() => {
        const isUrlValid = /^https?:\/\/github\.com\/[\w.-]+\/[\w.-]+/.test(repoUrl);
        setIsValid(isUrlValid && teamName.length > 0 && teamLeader.length > 0);
    }, [repoUrl, teamName, teamLeader]);

    // Timer Effect
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    // Terminal Auto-scroll
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [thoughtLines]);

    // Particle Effect
    useEffect(() => {
        if (screen !== 'landing') return;
        const container = document.querySelector('.particles');
        if (!container) return;
        container.innerHTML = '';
        const codeBits = ['0', '1', 'f', 'x', '{', '}', ';', '=>', 'git', 'ci', 'cd'];
        for (let i = 0; i < 20; i++) {
            const p = document.createElement('span');
            p.className = 'particle';
            p.textContent = randomFrom(codeBits);
            p.style.left = `${Math.random() * 100}%`;
            p.style.animationDuration = `${5 + Math.random() * 10}s`;
            p.style.animationDelay = `${Math.random() * 5}s`;
            p.style.opacity = Math.random() * 0.5;
            container.appendChild(p);
        }
    }, [screen]);

    // Landing Terminal Typing
    useEffect(() => {
        if (screen !== 'landing') return;
        let lineIdx = 0;
        let charIdx = 0;
        let currentLine = landingLines[lineIdx];

        const typingEffect = () => {
            const typeInterval = setInterval(() => {
                if (charIdx < currentLine.length) {
                    setLandingTermText(prev => prev + currentLine[charIdx]);
                    charIdx++;
                } else {
                    clearInterval(typeInterval);
                    setTimeout(() => {
                        setLandingTermLines(prev => [...prev.slice(-4), currentLine]);
                        setLandingTermText('');
                        lineIdx = (lineIdx + 1) % landingLines.length;
                        currentLine = landingLines[lineIdx];
                        charIdx = 0;
                        typingEffect();
                    }, 1500);
                }
            }, 40);
        };

        typingEffect();
        return () => { };
    }, [screen]);

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const secs = s % 60;
        return `${String(m).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const handleStartHealingClick = () => {
        setIsConfigOpen(true);
    };

    const handleRunAgent = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await fetch('http://localhost:3000/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoUrl,
                    teamName,
                    leaderName: teamLeader
                })
            });
            const data = await res.json();
            if (res.ok && data.jobId) {
                setJobId(data.jobId);
                setIsLoading(false);
                setIsConfigOpen(false);
                setScreen('dashboard');
                startPolling(data.jobId);
            } else {
                alert(`Error: ${data.error}`);
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            alert("Failed to connect to backend");
            setIsLoading(false);
        }
    };

    const startPolling = (jobId) => {
        setIsRunning(true);
        setThoughtLines([{
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            agent: 'orchestrator',
            msg: `Job ${jobId} initiated. Spinning up Docker Sandbox...`
        }]);
        setFixes([]);
        setTimeline([]);
        setTimer(0);
        setCiStatus('RUNNING');
        setDebrief('');
        setCurrentIteration(1);
        setTargetBranch(teamName.toUpperCase().replace(/\s+/g, '_') + '_' + teamLeader.toUpperCase().replace(/\s+/g, '_') + '_AI_Fix');

        // Initial fake health base
        const before = 45;
        setHealthScores({ before, after: before });
        setMetrics({ test: 0, lint: 0, type: 0, imports: 0 });

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`http://localhost:3000/api/status/${jobId}`);
                const data = await res.json();

                if (!res.ok) {
                    console.error("Poll error:", data);
                    return;
                }

                // If finished (data.ciCdStatus exists in the final results object)
                if (data.ciCdStatus) {
                    clearInterval(pollInterval);
                    finishRun(data);
                    return;
                }

                // Still running
                setCurrentIteration(data.currentIteration || 1);
                setCiStatus(data.status || 'RUNNING');

                if (data.timeline && data.timeline.length > 0) {
                    // Map backend timeline strings to thought bubbles
                    const newThoughts = data.timeline.map(t => {
                        let agent = 'orchestrator';
                        const msgLower = t.status.toLowerCase();
                        if (msgLower.includes('clone') || msgLower.includes('fork')) agent = 'orchestrator';
                        if (msgLower.includes('fail')) agent = 'analyzer';
                        if (msgLower.includes('apply') || msgLower.includes('fix')) agent = 'fixer';
                        if (msgLower.includes('push')) agent = 'committer';

                        return {
                            time: new Date(t.timestamp).toLocaleTimeString('en-US', { hour12: false }),
                            agent,
                            msg: t.status // The actual string from the backend event
                        };
                    });

                    // Only update if length changed to prevent re-renders
                    setThoughtLines(prev => newThoughts.length > prev.length ? newThoughts : prev);

                    // Track high level timeline nodes
                    const uniqueIters = [...new Set(data.timeline.map(t => t.iteration))];
                    const newTimelineArr = uniqueIters.map(iter => {
                        // find the last event for this iteration
                        const events = data.timeline.filter(t => t.iteration === iter);
                        const lastEvent = events[events.length - 1];
                        return {
                            iteration: iter,
                            status: lastEvent.status.includes('FAIL') ? 'fail' : 'success',
                            duration: 'active',
                            sha: 'HEAD'
                        };
                    });
                    setTimeline(newTimelineArr);
                }

            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 2000);

        timeoutsRef.current.push(pollInterval);
    };

    const finishRun = (resultsData) => {
        setIsRunning(false);
        const finalPassed = resultsData.ciCdStatus === 'PASSED';
        setCiStatus(finalPassed ? 'PASSED' : 'FAILED');
        setResults({ passed: finalPassed });

        setCurrentIteration(resultsData.iterationsUsed);

        // Map final timeline
        if (resultsData.timeline) {
            const uniqueIters = [...new Set(resultsData.timeline.map(t => t.iteration))];
            const newTimelineArr = uniqueIters.map(iter => {
                const events = resultsData.timeline.filter(t => t.iteration === iter);
                const lastEvent = events[events.length - 1];
                return {
                    iteration: iter,
                    status: lastEvent.status.includes('FAIL') ? 'fail' : 'success',
                    duration: 'complete',
                    sha: 'HEAD'
                };
            });
            setTimeline(newTimelineArr);
        }

        // Map final fixes
        if (resultsData.fixes) {
            const newFixes = resultsData.fixes.map(f => ({
                file: f.file,
                bugType: f.bugType,
                line: f.lineNumber,
                confidence: 95,
                description: f.commitMessage,
                status: f.status
            }));
            setFixes(newFixes);
        }

        // Base starting health 
        const baseHealth = Math.floor(Math.random() * (55 - 35 + 1)) + 35; // Random start 35-55

        // Calculate dynamic final health based on iterations and failures
        let dynamicFinalHealth;
        if (finalPassed) {
            // If it passed with 0 bugs originally, it's 100
            // Otherwise, deduct 2 points per iteration taken to fix it.
            dynamicFinalHealth = resultsData.iterationsUsed === 0 ? 100 : Math.max(90, 100 - (resultsData.iterationsUsed * 2));
        } else {
            dynamicFinalHealth = Math.max(15, 85 - (resultsData.totalFailures * 5));
        }

        setHealthScores(prev => ({ ...prev, before: baseHealth, after: dynamicFinalHealth }));

        const testMetric = finalPassed ? 100 : Math.max(0, 100 - (resultsData.totalFailures * 10));
        const lintMetric = finalPassed ? Math.min(100, 80 + (resultsData.totalFixes * 5)) : 75;
        const typeMetric = finalPassed ? Math.min(100, 85 + (resultsData.totalFixes * 3)) : 80;

        setMetrics({
            test: testMetric,
            lint: lintMetric,
            type: typeMetric,
            imports: 100
        });

        const rawDebrief = finalPassed ? DEBRIEF_PASSED : DEBRIEF_FAILED;
        setDebrief(interpolateMessage(rawDebrief, {
            fixes: String(resultsData.totalFixes || 0),
            files: 'multi',
            testBefore: String(baseHealth),
            testAfter: String(testMetric),
            delta: String(dynamicFinalHealth - baseHealth),
            iterations: String(resultsData.iterationsUsed),
            totalFixes: String(resultsData.totalFixes || 0),
            failedFixes: String(resultsData.totalFailures || 0),
            remainingFailures: finalPassed ? '0' : String(resultsData.totalFailures || 1)
        }));
    };

    const stopSimulation = () => {
        setIsRunning(false);
        timeoutsRef.current.forEach(clearTimeout);
        setScreen('landing');
    };

    return (
        <div id="app">
            <CustomCursor />
            {/* ========== SCREEN 1: LANDING PAGE ========== */}
            {screen === 'landing' && (
                <div id="screen-landing" className="screen active">
                    <div className="landing-bg">
                        <NeuralNexus />
                    </div>

                    <header className="landing-header">
                        <div className="nav-left">
                            <div className="nav-logo">
                                <svg className="logo-svg" viewBox="0 0 36 36" fill="none">
                                    <path d="M18 4L30 11V25L18 32L6 25V11L18 4Z" stroke="url(#nav-grad)" strokeWidth="2" opacity="0.3" />
                                    <path d="M18 10L24 13.5V22.5L18 26L12 22.5V13.5L18 10Z" stroke="url(#nav-grad)" strokeWidth="2" />
                                    <path d="M18 15L20 18L18 21L16 18L18 15Z" fill="url(#nav-grad)" />
                                    <path d="M18 4V32M6 11L30 25M30 11L6 25" stroke="url(#nav-grad)" strokeWidth="0.5" opacity="0.2" />
                                    <defs>
                                        <linearGradient id="nav-grad" x1="2" y1="2" x2="34" y2="34">
                                            <stop offset="0%" stopColor="#c084fc" />
                                            <stop offset="100%" stopColor="#7c3aed" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="nav-brand">
                                    <div className="title-wrapper">
                                        <span className="nav-title">Zenith</span>
                                        <span className="passed-badge">PASSED</span>
                                    </div>
                                    <span className="nav-subtitle">CI/CD Healing Agent</span>
                                </div>
                            </div>
                        </div>
                        <div className="nav-right">
                            <div className="header-status">
                                <span className="header-status-dot"></span>
                                <span>System Ready</span>
                            </div>
                        </div>
                    </header>

                    <section className="hero">
                        <div className="hero-badge">
                            <span className="hero-badge-line"></span>
                            <span className="hero-badge-text">AUTONOMOUS HEALING</span>
                            <span className="hero-badge-line"></span>
                        </div>
                        <h1 className="hero-title">
                            <DecryptedText
                                text="Fix Your Repos"
                                className="hero-line-1"
                                speed={60}
                                maxIterations={3}
                                sequential={true}
                            />
                            <DecryptedText
                                text="While You Sleep"
                                className="hero-line-2"
                                speed={60}
                                maxIterations={3}
                                sequential={true}
                            />
                        </h1>
                        <p className="hero-desc">
                            Zenith scans, diagnoses, and auto-heals CI/CD failures using a
                            multi-agent AI pipeline. Paste your repo and let the agents work.
                        </p>
                        <div className="hero-actions">
                            <button className="btn-primary-landing" onClick={handleStartHealingClick}>
                                Start Healing Run
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                    <polyline points="12 5 19 12 12 19" />
                                </svg>
                            </button>
                        </div>
                        <div className="hero-stats">
                            <div className="stat-item">
                                <span className="stat-number">94</span><span className="stat-suffix">%</span>
                                <span className="stat-label">Fix Rate</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">12</span><span className="stat-suffix">s</span>
                                <span className="stat-label">Avg Heal Time</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">5</span>
                                <span className="stat-label">AI Agents</span>
                            </div>
                        </div>
                    </section>

                    <section className="features-section">
                        <div className="features-grid">
                            <div className="features-left">
                                <div className="feature-card feature-card-1">
                                    <div className="feature-icon-wrap">
                                        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                        </svg>
                                    </div>
                                    <div className="feature-text">
                                        <h3>AI-Powered Analysis</h3>
                                        <p>Deep code scanning with multi-agent orchestration that identifies issues across your entire codebase.</p>
                                    </div>
                                </div>
                                <div className="feature-card feature-card-2">
                                    <div className="feature-icon-wrap">
                                        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    </div>
                                    <div className="feature-text">
                                        <h3>CI/CD Integration</h3>
                                        <p>Seamless pipeline healing and auto-fix commits pushed directly to your healing branch.</p>
                                    </div>
                                </div>
                                <div className="feature-card feature-card-3">
                                    <div className="feature-icon-wrap">
                                        <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <div className="feature-text">
                                        <h3>Safe & Verified</h3>
                                        <p>Every fix is validated through CI pipeline before merge. Automatic rollback on regression.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="features-right">
                                <div className="terminal-preview">
                                    <div className="terminal-chrome">
                                        <div className="terminal-dots">
                                            <span className="dot dot-red"></span>
                                            <span className="dot dot-yellow"></span>
                                            <span className="dot dot-green"></span>
                                        </div>
                                        <span className="terminal-title">zenith-agent</span>
                                    </div>
                                    <div className="terminal-body" id="landing-terminal">
                                        {landingTermLines.map((line, idx) => (
                                            <div key={idx} className="term-line">
                                                <span className="term-msg" style={{ color: 'var(--text-3)' }}>{line}</span>
                                            </div>
                                        ))}
                                        <div className="term-line term-prompt">
                                            <span className="term-symbol">$</span>
                                            <span className="term-text typing">{landingTermText}</span>
                                            <span className="term-cursor">▋</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="cta-card">
                                    <div className="cta-card-content">
                                        <div className="cta-icon-wrap">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                        </div>
                                        <div className="cta-text">
                                            <h4>Ready to heal?</h4>
                                            <p>Set up your first run in seconds</p>
                                        </div>
                                    </div>
                                    <button className="btn-cta-configure" onClick={() => setIsConfigOpen(true)}>
                                        Configure Run
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                            <polyline points="12 5 19 12 12 19" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="agents-section">
                        <h2 className="section-title">Multi-Agent Pipeline</h2>
                        <p className="section-desc">Five specialized AI agents work in sequence to heal your codebase</p>
                        <div className="agents-row">
                            <div className="agent-card">
                                <div className="agent-avatar agent-purple">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <span className="agent-name">Orchestrator</span>
                                <span className="agent-role">Coordinator</span>
                            </div>
                            <div className="agent-connector">
                                <div className="connector-line"></div>
                                <div className="connector-dot"></div>
                            </div>
                            <div className="agent-card">
                                <div className="agent-avatar agent-blue">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <span className="agent-name">Analyzer</span>
                                <span className="agent-role">Scanner</span>
                            </div>
                            <div className="agent-connector">
                                <div className="connector-line"></div>
                                <div className="connector-dot"></div>
                            </div>
                            <div className="agent-card">
                                <div className="agent-avatar agent-amber">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                                    </svg>
                                </div>
                                <span className="agent-name">Fixer</span>
                                <span className="agent-role">Patcher</span>
                            </div>
                            <div className="agent-connector">
                                <div className="connector-line"></div>
                                <div className="connector-dot"></div>
                            </div>
                            <div className="agent-card">
                                <div className="agent-avatar agent-green">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                </div>
                                <span className="agent-name">Committer</span>
                                <span className="agent-role">Deployer</span>
                            </div>
                            <div className="agent-connector">
                                <div className="connector-line"></div>
                                <div className="connector-dot"></div>
                            </div>
                            <div className="agent-card">
                                <div className="agent-avatar agent-cyan">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                </div>
                                <span className="agent-name">Verifier</span>
                                <span className="agent-role">Validator</span>
                            </div>
                        </div>
                    </section>

                    <footer className="landing-footer">
                        <span>RIFT 2026 — Zenith CI/CD Healing Agent</span>
                        <span className="footer-dot">·</span>
                        <span>Built with autonomous AI</span>
                        <div className="footer-bottom-glow"></div>
                    </footer>
                </div>
            )}


            {/* ========== CONFIGURE MODAL ========== */}
            {isConfigOpen && (
                <div id="config-modal" className="modal-overlay open">
                    <div className="modal-card glass-card">
                        <div className="modal-header">
                            <div className="modal-title-row">
                                <svg className="modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                                <span>Start Healing Run</span>
                            </div>
                            <button className="modal-close" onClick={() => setIsConfigOpen(false)}>&times;</button>
                        </div>
                        <form className="agent-form" onSubmit={handleRunAgent}>
                            <div className="form-group">
                                <label className="form-label">Repository URL</label>
                                <div className="input-wrapper">
                                    <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                                    <input type="url" className="form-input" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} required placeholder="https://github.com/owner/repo" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Team Name</label>
                                    <div className="input-wrapper">
                                        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                        <input type="text" className="form-input" value={teamName} onChange={e => setTeamName(e.target.value)} required placeholder="Frontend Core" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Team Leader</label>
                                    <div className="input-wrapper">
                                        <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                        <input type="text" className="form-input" value={teamLeader} onChange={e => setTeamLeader(e.target.value)} required placeholder="Jane Doe" />
                                    </div>
                                </div>
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label className="form-label">Max Iterations</label>
                                    <span className="iter-value">{maxIterations}</span>
                                </div>
                                <div className="slider-wrapper">
                                    <input type="range" min="1" max="10" step="1" className="form-slider" value={maxIterations} onChange={e => setMaxIterations(parseInt(e.target.value))} />
                                    <div className="slider-labels">
                                        <span className="slider-mark" style={{ left: '0%' }}>1</span>
                                        <span className="slider-mark" style={{ left: '44.4%', transform: 'translateX(-50%)' }}>5</span>
                                        <span className="slider-mark" style={{ left: '100%', transform: 'translateX(-100%)' }}>10</span>
                                    </div>
                                </div>
                            </div>
                            {targetBranch && (
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                                        Target Branch
                                    </label>
                                    <div className="branch-preview">
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="var(--emerald)" strokeWidth="2"><path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                                        <span style={{ color: 'var(--emerald)', fontWeight: '600', fontFamily: 'var(--font-mono)' }}>{targetBranch}</span>
                                    </div>
                                </div>
                            )}
                            <button type="submit" className="btn-run" disabled={!isValid || isLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                {isLoading ? (
                                    <>
                                        <svg className="spinner" viewBox="0 0 50 50" style={{ width: '18px', height: '18px' }}>
                                            <circle cx="25" cy="25" r="20" fill="none" stroke="var(--primary)" strokeWidth="5" style={{ opacity: 0.3 }}></circle>
                                            <circle cx="25" cy="25" r="20" fill="none" stroke="var(--primary)" strokeWidth="5" strokeDasharray="80" strokeDashoffset="60"></circle>
                                        </svg>
                                        <span>Initializing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                                        <span>Run Agent</span>
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ========== SCREEN 3: DASHBOARD ========== */}
            {screen === 'dashboard' && (
                <div id="screen-dashboard" className="screen active">
                    {/* Header */}
                    <header className="dash-header">
                        <div className="nav-left">
                            <div className="nav-logo">
                                <svg className="logo-svg" viewBox="0 0 36 36" fill="none">
                                    <path d="M18 4L30 11V25L18 32L6 25V11L18 4Z" stroke="url(#dash-grad)" strokeWidth="2" opacity="0.3" />
                                    <path d="M18 10L24 13.5V22.5L18 26L12 22.5V13.5L18 10Z" stroke="url(#dash-grad)" strokeWidth="2" />
                                    <path d="M18 15L20 18L18 21L16 18L18 15Z" fill="url(#dash-grad)" />
                                    <path d="M18 4V32M6 11L30 25M30 11L6 25" stroke="url(#dash-grad)" strokeWidth="0.5" opacity="0.2" />
                                    <defs>
                                        <linearGradient id="dash-grad" x1="2" y1="2" x2="34" y2="34">
                                            <stop offset="0%" stopColor="#c084fc" />
                                            <stop offset="100%" stopColor="#7c3aed" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div className="nav-brand">
                                    <span className="nav-title">Zenith</span>
                                    <span className="nav-subtitle">CI/CD Healing Agent</span>
                                </div>
                            </div>
                        </div>
                        <div className="nav-right">
                            <div className={`status-badge status-${isRunning ? 'running' : (results?.passed ? 'passed' : 'failed')}`}>
                                <span className="status-dot"></span>
                                <span>{isRunning ? 'RUNNING' : (results?.passed ? 'PASSED' : 'FAILED')}</span>
                            </div>
                        </div>
                    </header>

                    {/* Metadata Bar */}
                    <section className="dash-input-bar">
                        <div className="dash-input-info">
                            <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                            <span className="dash-value mono">{repoUrl.replace('https://github.com/', '')}</span>
                        </div>
                        <div className="dash-input-info">
                            <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                            <span className="dash-value">{teamName}</span>
                        </div>
                        <div className="dash-input-info">
                            <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                            <span className="dash-value mono">{targetBranch}</span>
                        </div>
                        <div className="dash-input-info">
                            <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            <span className="dash-value mono">{maxIterations} max</span>
                        </div>
                        {isRunning && <button className="btn-danger-sm" onClick={() => stopSimulation()}>Stop Run</button>}
                    </section>

                    {/* Row 1: Health & Summary */}
                    <div className="dash-row dash-row-1">
                        <div className="dash-card glass-card health-card">
                            <div className="card-header">
                                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                                <span>Health Score</span>
                            </div>
                            <div className="health-rings">
                                <div className="ring-container">
                                    <svg className="ring-svg" viewBox="0 0 120 120">
                                        <circle className="ring-bg" cx="60" cy="60" r="52" />
                                        <circle className="ring-progress ring-before" cx="60" cy="60" r="52" style={{ strokeDashoffset: 326.73 - (healthScores.before / 100) * 326.73 }} />
                                        <text className="ring-value" x="60" y="60">{healthScores.before}</text>
                                        <text className="ring-label" x="60" y="80">Before</text>
                                    </svg>
                                </div>
                                <div className="health-delta">
                                    <div className="delta-arrow">
                                        {healthScores.after >= healthScores.before ? '↗' : '↘'}
                                    </div>
                                    <div className={`delta-value ${healthScores.after >= healthScores.before ? 'delta-pos' : 'delta-neg'}`}>
                                        {healthScores.after >= healthScores.before ? '+' : ''}{healthScores.after - healthScores.before} points
                                    </div>
                                </div>
                                <div className="ring-container">
                                    <svg className="ring-svg" viewBox="0 0 120 120">
                                        <circle className="ring-bg" cx="60" cy="60" r="52" />
                                        <circle className="ring-progress ring-after" cx="60" cy="60" r="52" style={{ strokeDashoffset: 326.73 - (healthScores.after / 100) * 326.73 }} />
                                        <text className="ring-value" x="60" y="60">{healthScores.after}</text>
                                        <text className="ring-label" x="60" y="80">After</text>
                                    </svg>
                                </div>
                            </div>
                            <div className="health-metrics">
                                <div className="metric-bar">
                                    <span className="metric-label">Test Pass Rate</span>
                                    <div className="metric-track"><div className="metric-fill" style={{ width: `${metrics.test}%` }}></div></div>
                                    <span className="metric-val">{metrics.test}%</span>
                                </div>
                                <div className="metric-bar">
                                    <span className="metric-label">Lint Score</span>
                                    <div className="metric-track"><div className="metric-fill metric-fill-cyan" style={{ width: `${metrics.lint}%` }}></div></div>
                                    <span className="metric-val">{metrics.lint}%</span>
                                </div>
                                <div className="metric-bar">
                                    <span className="metric-label">Type Coverage</span>
                                    <div className="metric-track"><div className="metric-fill metric-fill-purple" style={{ width: `${metrics.type}%` }}></div></div>
                                    <span className="metric-val">{metrics.type}%</span>
                                </div>
                                <div className="metric-bar">
                                    <span className="metric-label">Import Health</span>
                                    <div className="metric-track"><div className="metric-fill metric-fill-amber" style={{ width: `${metrics.imports}%` }}></div></div>
                                    <span className="metric-val">{metrics.imports}%</span>
                                </div>
                            </div>
                        </div>

                        <div className="dash-card glass-card summary-card">
                            <div className="card-header">
                                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                <span>Run Summary</span>
                                <span className={`ci-badge ci-${ciStatus.toLowerCase()}`} style={{ marginLeft: 'auto' }}>{ciStatus}</span>
                            </div>
                            <div className="summary-body">
                                <div className="summary-item"><span className="summary-label">Repository</span><span className="summary-val mono">{repoUrl.split('/').pop()}</span></div>
                                <div className="summary-item"><span className="summary-label">Team</span><span className="summary-val">{teamName}</span></div>
                                <div className="summary-item"><span className="summary-label">Leader</span><span className="summary-val">{teamLeader}</span></div>
                                <div className="summary-item"><span className="summary-label">Branch</span><span className="summary-val mono">{targetBranch} <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg></span></div>
                                <div className="summary-item"><span className="summary-label">Failures</span><span className="summary-val badge-red">{fixes.filter(f => f.status === 'Failed' || f.status === 'Escalated').length}</span></div>
                                <div className="summary-item"><span className="summary-label">Elapsed</span><span className="summary-val mono">{formatTime(timer)}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Thought Stream */}
                    <section className="dash-row dash-row-2">
                        <div className="dash-card glass-card thought-card">
                            <div className="card-header">
                                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                <span>Thought Stream</span>
                                <div className="thought-agent-indicator">
                                    <span className="agent-dot" style={{ background: `var(--agent-${currentAgent})` }}></span>
                                    <span>{currentAgent.toUpperCase()} Agent</span>
                                </div>
                            </div>
                            <div className="thought-terminal" ref={terminalRef}>
                                {thoughtLines.map((line, idx) => (
                                    <div key={idx} className="terminal-line">
                                        <span className="term-time">{line.time}</span>
                                        <span className={`term-agent agent-${line.agent}`}>{line.agent.toUpperCase()}</span>
                                        <span className="term-msg">{line.msg}</span>
                                    </div>
                                ))}
                                {isRunning && <div className="terminal-line"><span className="term-msg blink">_</span></div>}
                            </div>
                        </div>
                    </section>

                    {/* Row 3: Fixes & Timeline */}
                    <section className="dash-row dash-row-3">
                        <div className="dash-card glass-card fixes-card">
                            <div className="card-header">
                                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                                <span>Fixes</span>
                                <span className="badge-m" style={{ marginLeft: '8px' }}>{fixes.length}</span>
                                <div className="card-actions">
                                    <button className="btn-ghost"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4M7 10l5 5 5-5M12 15V3" /></svg> CSV</button>
                                </div>
                            </div>
                            <div className="fixes-table-wrapper">
                                <table className="fixes-table">
                                    <thead>
                                        <tr>
                                            <th>File</th>
                                            <th>Type</th>
                                            <th>Line</th>
                                            <th>Confidence</th>
                                            <th>Description</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fixes.map((fix, idx) => (
                                            <tr key={idx}>
                                                <td className="file-cell" title={fix.file}>{fix.file.split('/').pop()}</td>
                                                <td><span className={`bug-badge bug-${fix.bugType}`}>{fix.bugType}</span></td>
                                                <td className="line-num">{fix.line}</td>
                                                <td>
                                                    <div className="confidence-bar">
                                                        <div className="confidence-track"><div className={`confidence-fill ${fix.confidence > 80 ? 'conf-high' : fix.confidence > 60 ? 'conf-med' : 'conf-low'}`} style={{ width: `${fix.confidence}%` }}></div></div>
                                                        <span className="confidence-val">{fix.confidence}%</span>
                                                    </div>
                                                </td>
                                                <td>{fix.description}</td>
                                                <td><span className={`fix-status fix-${fix.status.toLowerCase()}`}>{fix.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {fixes.length === 0 && <div className="fixes-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" /></svg> Waiting for fixer agent...</div>}
                            </div>
                        </div>

                        <div className="dash-card glass-card timeline-card">
                            <div className="card-header">
                                <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                                <span>CI/CD Timeline</span>
                                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-m)' }}>Iterations: {currentIteration} / {maxIterations}</span>
                            </div>
                            <div className="timeline-list">
                                {timeline.map((item, idx) => (
                                    <div key={idx} className="timeline-item">
                                        <div className={`timeline-icon tl-${item.status === 'success' ? 'success' : 'fail'}`}>
                                            {item.status === 'success' ? '✓' : '✗'}
                                        </div>
                                        <div className="timeline-body">
                                            <div className="tl-title">Iteration {item.iteration}</div>
                                            <div className="tl-meta">
                                                <span>🕒 {item.duration}</span>
                                                <span className="tl-sha">⚓ {item.sha} ↗</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {timeline.length === 0 && <div className="timeline-empty">Waiting for first CI run...</div>}
                            </div>
                        </div>
                    </section>

                    {/* Row 4: Score & Debrief */}
                    {!isRunning && results && (
                        <section className="dash-row dash-row-4">
                            <div className="dash-card glass-card score-card">
                                <div className="card-header">
                                    <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15l-2 5L9 9l11 4-5 2zm0 0l4 4" /></svg>
                                    <span>Score Breakdown</span>
                                </div>
                                <div className="score-body">
                                    <div className="score-big">
                                        <div className="score-number">{healthScores.after}</div>
                                        <div className="score-suffix">/100</div>
                                    </div>
                                    <div className="score-stats">
                                        <div className="score-stat-card">
                                            <div className="score-stat-val">78</div>
                                            <div className="score-stat-label">Base Score</div>
                                        </div>
                                        <div className="score-stat-card">
                                            <div className="score-stat-val val-pos">+18</div>
                                            <div className="score-stat-label">Speed Bonus</div>
                                        </div>
                                        <div className="score-stat-card">
                                            <div className="score-stat-val val-neg">-4</div>
                                            <div className="score-stat-label">Penalty</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="dash-card glass-card debrief-card">
                                <div className="card-header">
                                    <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                                    <span>AI Debrief</span>
                                </div>
                                <div className="debrief-content">
                                    <p>{debrief}</p>
                                    <div className="debrief-footer">
                                        <span>⚙️ Generated by Zenith-Core</span>
                                        <span>📅 {new Date().toISOString().split('T')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Bottom Action */}
                    {!isRunning && results && (
                        <div className="dash-footer">
                            <button className="btn-run" onClick={() => setScreen('landing')}>
                                Start New Run
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
