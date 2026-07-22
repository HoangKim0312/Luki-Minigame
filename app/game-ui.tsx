"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import type { GameDefinition } from "../lib/games";
import type { PublicPlayer, RoomPhase } from "../lib/realtime";

const themes: Record<GameDefinition["tone"], Record<string, string>> = {
  lime: { primary: "#c9ff4a", secondary: "#845ef7", accent: "#ff7eb6", glow: "rgba(201,255,74,.22)" },
  violet: { primary: "#b69cff", secondary: "#c9ff4a", accent: "#ff9f5a", glow: "rgba(182,156,255,.24)" },
  coral: { primary: "#ff8f70", secondary: "#ffcf56", accent: "#a994ff", glow: "rgba(255,143,112,.24)" },
  sky: { primary: "#6ee7ff", secondary: "#a994ff", accent: "#ffd85a", glow: "rgba(110,231,255,.22)" },
};

export function GameShell({tone,header,main,sidebar}:{tone:GameDefinition["tone"];header:ReactNode;main:ReactNode;sidebar:ReactNode}){
  const theme=themes[tone];
  const style={"--game-primary":theme.primary,"--game-secondary":theme.secondary,"--game-accent":theme.accent,"--game-glow":theme.glow} as CSSProperties;
  return <main className="game-shell" style={style}>
    <div className="game-background" aria-hidden="true"><i/><i/><i/><i/><span>✦</span><span>?</span></div>
    <div className="game-shell-inner">{header}<div className="game-layout"><section className="game-main">{main}</section>{sidebar}</div></div>
  </main>
}

export function GameHeader({icon,name,code,connected,labels}:{icon:string;name:string;code:string;connected:boolean;labels:{room:string;copy:string;copied:string;connected:string;reconnecting:string}}){
  const [copied,setCopied]=useState(false);
  async function copy(){await navigator.clipboard.writeText(code);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}
  return <header className="game-header">
    <div className="game-header-brand"><span className="game-logo">L</span><div><small>LUKI PARTY</small><strong><i>{icon}</i>{name}</strong></div></div>
    <div className="game-header-actions">
      <button className="game-room-code" onClick={copy} aria-label={`${labels.copy} ${code}`}><small>{labels.room}</small><strong>{code}</strong><span>{copied?"✓":"⧉"}</span><em>{copied?labels.copied:labels.copy}</em></button>
      <span className={`connection-pill ${connected?"":"offline"}`}><i/>{connected?labels.connected:labels.reconnecting}</span>
    </div>
  </header>
}

function avatarTone(name:string){return [...name].reduce((sum,char)=>sum+char.charCodeAt(0),0)%6}

export function PlayerCard({player,isHost,isYou,phase,answered,labels}:{player:PublicPlayer;isHost:boolean;isYou:boolean;phase:RoomPhase;answered:boolean;labels:{host:string;you:string;ready:string;thinking:string;answered:string;offline:string}}){
  const isReady=phase==="lobby"&&player.ready;
  const status=!player.connected?labels.offline:phase==="lobby"?(player.ready?labels.ready:labels.thinking):answered?labels.answered:`${player.score} pts`;
  return <div className={`social-player ${isReady?"is-ready":""} ${answered?"has-answered":""} ${player.connected?"":"is-offline"}`}>
    <span className={`social-avatar avatar-tone-${avatarTone(player.name)}`} aria-hidden="true">{player.name.slice(0,2).toUpperCase()}</span>
    <div><strong>{player.name}{isYou&&<em> · {labels.you}</em>}</strong><small>{status}</small></div>
    <span className="player-badges">{isHost&&<b title={labels.host}>♛</b>}{(isReady||answered)&&<i>✓</i>}</span>
  </div>
}

export function GameSidebar({players,hostId,playerId,phase,answeredIds,labels,inviteAction,children}:{players:PublicPlayer[];hostId:string;playerId:string;phase:RoomPhase;answeredIds:string[];labels:{players:string;host:string;you:string;ready:string;thinking:string;answered:string;offline:string;invite:string};inviteAction?:()=>void;children:ReactNode}){
  return <aside className="game-sidebar">
    <section className="players-card">
      <header><div><span>👥</span><strong>{labels.players}</strong></div><b>{players.filter(player=>player.connected).length}/{players.length}</b></header>
      <div className="social-player-list">{players.map(player=><PlayerCard key={player.id} player={player} isHost={player.id===hostId} isYou={player.id===playerId} phase={phase} answered={answeredIds.includes(player.id)} labels={labels}/>)}</div>
      {inviteAction&&<button className="invite-button" onClick={inviteAction}>＋ {labels.invite}</button>}
    </section>
    {children}
  </aside>
}

export function GameStatusBanner({icon="✦",children,tone="default"}:{icon?:string;children:ReactNode;tone?:"default"|"success"|"waiting"}){
  return <div className={`game-status-banner ${tone}`}><span>{icon}</span><strong>{children}</strong></div>
}

export function QuestionCard({round,total,question}:{round:number;total:number;question:string}){
  const progress=Math.max(0,Math.min(100,(round/Math.max(total,1))*100));
  return <div className="question-card"><div className="question-meta"><span>CÂU {String(round).padStart(2,"0")} / {String(total).padStart(2,"0")}</span><b>{Math.round(progress)}%</b></div><div className="question-progress"><i style={{width:`${progress}%`}}/></div><h1>{question}</h1></div>
}

export function Scoreboard({players,winnerLabel}:{players:PublicPlayer[];winnerLabel:string}){
  const ranked=[...players].sort((a,b)=>b.score-a.score);
  return <div className="scoreboard"><div className="winner-crown">🏆</div><span className="table-kicker">{winnerLabel}</span><h1>{ranked[0]?.name}</h1><div className="score-list">{ranked.map((player,index)=><div className={index===0?"winner":""} key={player.id}><span>{index===0?"🥇":index===1?"🥈":index===2?"🥉":String(index+1).padStart(2,"0")}</span><div><strong>{player.name}</strong><small>{index===0?winnerLabel:"LUKI PARTY"}</small></div><b>{player.score.toLocaleString()} pts</b></div>)}</div></div>
}
