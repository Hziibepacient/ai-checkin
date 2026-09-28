'use client';
import {useState} from 'react';
export default function WelcomeMedia({token,type}:{token:string,type:string|null}){const [error,setError]=useState(false);if(!type)return <div className="welcome-note">共同复盘，让下一次更好。</div>;if(error)return <div className="welcome-note">欢迎加入这次人机同行的旅程。<small>媒体暂时无法加载，你的签到已完成。</small></div>;return <div className="welcome-media">{type==='video/mp4'?<video controls playsInline muted autoPlay preload="metadata" src={`/api/media/${token}`} onError={()=>setError(true)}/>:<img src={`/api/media/${token}`} alt="季度复盘会欢迎海报" onError={()=>setError(true)}/>}</div>}
