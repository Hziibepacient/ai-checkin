import {getChatGPTUser,chatGPTSignInPath} from './chatgpt-auth';
import Dashboard from './dashboard';
export const dynamic='force-dynamic';
export default async function Home(){const user=await getChatGPTUser();if(!user)return <main className="login-screen"><div className="wordmark">A / I <span>EVENT CONSOLE</span></div><p className="eyebrow">季度复盘 · 人机同行</p><h1>每一次入场，<br/>都有 AI 同行。</h1><p>会务工作台 · 名单、专属邀请与欢迎仪式</p><a className="primary" href={chatGPTSignInPath('/')} target="_top">登录会务工作台 →</a><small>员工无需登录，将个人邀请函交给 Agent 即可。</small></main>;return <Dashboard/>}
