<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<meta name="design_doc_mode" content="canvas">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@400;500;600;700&family=Bitter:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
<style>
  @keyframes fd-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.82)} }
  @keyframes fd-ball { 0%{transform:translate(0,0)} 50%{transform:translate(6px,-9px)} 100%{transform:translate(0,0)} }
  @keyframes fd-run { 0%,100%{transform:translate(0,0)} 50%{transform:translate(3px,4px)} }
</style>
</helmet>

<!-- ============ SECTION A LABEL ============ -->
<div data-drags-parent="0" style="position:absolute;left:80px;top:32px;font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.22em;color:#1C1A17;text-transform:uppercase">Direção A · Clássico 7A0 — Fluxo completo</div>
<div style="position:absolute;left:80px;top:58px;font-family:Bitter,serif;font-size:13px;color:#6c6657;width:760px">Fundo creme, display preto condensado, vermelhão + dourado. Telas otimizadas para celular.</div>

<!-- ============ FRAME 1 · HOME ============ -->
<div style="position:absolute;left:80px;top:108px;width:392px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">01 · Início — criar / entrar</div>
  <div style="background:#ECE4CF;border-radius:26px;box-shadow:0 12px 34px rgba(28,26,23,.18);overflow:hidden;width:392px;border:1px solid #d8cdaf">
    <div style="padding:30px 26px 28px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.2em;color:#1C1A17;text-transform:uppercase">Copa entre amigos</span>
        <span style="font-family:Oswald,sans-serif;font-weight:500;font-size:11px;letter-spacing:.14em;color:#8a8470;text-transform:uppercase;border:1.5px solid #1C1A17;border-radius:20px;padding:5px 12px">Sem cadastro</span>
      </div>
      <div style="margin-top:34px;line-height:.8">
        <div style="font-family:Anton,sans-serif;font-size:84px;color:#1C1A17;letter-spacing:-.01em">FUT</div>
        <div style="display:flex;align-items:flex-end;gap:14px">
          <div style="font-family:Anton,sans-serif;font-size:84px;color:#1C1A17;letter-spacing:-.01em">DRAFT</div>
          <div style="width:18px;height:18px;border-radius:50%;background:#C7A24A;margin-bottom:14px;animation:fd-ball 2.4s ease-in-out infinite"></div>
        </div>
      </div>
      <div style="margin-top:18px;width:74px;height:11px;background:#C7A24A"></div>
      <p style="margin:22px 0 0;font-family:Bitter,serif;font-size:16px;line-height:1.45;color:#34302a;max-width:300px">Crie uma sala, compartilhe o código e montem os times num <strong>draft</strong>. Depois é só simular a copa.</p>

      <button style="margin-top:26px;width:100%;border:none;background:#E94E27;box-shadow:0 5px 0 #B43A1A;border-radius:8px;padding:18px;font-family:Anton,sans-serif;font-size:22px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px">Criar sala <span style="font-family:Oswald,sans-serif;font-weight:700">→</span></button>

      <div style="margin-top:14px;background:#FBF9F2;border:2px solid #1C1A17;border-radius:8px;padding:6px 6px 6px 16px;display:flex;align-items:center;gap:10px">
        <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">Código</span>
        <span style="font-family:Anton,sans-serif;font-size:24px;letter-spacing:.14em;color:#1C1A17;flex:1">K7Q2</span>
        <button style="border:none;background:#1C1A17;border-radius:6px;padding:13px 18px;font-family:Anton,sans-serif;font-size:15px;letter-spacing:.04em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Entrar</button>
      </div>

      <div style="margin-top:28px;display:flex;border-top:1.5px solid #d3c8aa;padding-top:18px">
        <div style="flex:1;border-right:1.5px solid #d3c8aa;padding-right:8px">
          <div style="font-family:Anton,sans-serif;font-size:26px;color:#E94E27">01</div>
          <div style="font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.08em;color:#1C1A17;text-transform:uppercase;margin-top:2px">Entre</div>
          <div style="font-family:Bitter,serif;font-size:11px;color:#6c6657;line-height:1.3;margin-top:2px">Só nome de técnico</div>
        </div>
        <div style="flex:1;border-right:1.5px solid #d3c8aa;padding:0 8px">
          <div style="font-family:Anton,sans-serif;font-size:26px;color:#E94E27">02</div>
          <div style="font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.08em;color:#1C1A17;text-transform:uppercase;margin-top:2px">Drafte</div>
          <div style="font-family:Bitter,serif;font-size:11px;color:#6c6657;line-height:1.3;margin-top:2px">Escolha os craques</div>
        </div>
        <div style="flex:1;padding-left:8px">
          <div style="font-family:Anton,sans-serif;font-size:26px;color:#E94E27">03</div>
          <div style="font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.08em;color:#1C1A17;text-transform:uppercase;margin-top:2px">Simule</div>
          <div style="font-family:Bitter,serif;font-size:11px;color:#6c6657;line-height:1.3;margin-top:2px">Veja o jogo 2D</div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ FRAME 2 · LOBBY ============ -->
<div style="position:absolute;left:540px;top:108px;width:392px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">02 · Lobby — sala de espera</div>
  <div style="background:#ECE4CF;border-radius:26px;box-shadow:0 12px 34px rgba(28,26,23,.18);overflow:hidden;width:392px;border:1px solid #d8cdaf">
    <div style="background:#1C1A17;padding:24px 26px 22px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.2em;color:#C7A24A;text-transform:uppercase">Sala aberta</span>
        <span style="display:flex;align-items:center;gap:6px;font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.14em;color:#ECE4CF;text-transform:uppercase"><span style="width:8px;height:8px;border-radius:50%;background:#E94E27;animation:fd-pulse 1.4s infinite"></span>4 técnicos</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:12px;margin-top:14px">
        <span style="font-family:Anton,sans-serif;font-size:52px;letter-spacing:.1em;color:#FBF9F2">K7Q2</span>
        <span style="font-family:Oswald,sans-serif;font-weight:500;font-size:12px;letter-spacing:.06em;color:#8a8470;text-transform:uppercase;border:1.5px solid #4a463e;border-radius:6px;padding:6px 10px;cursor:pointer">Copiar</span>
      </div>
      <p style="margin:8px 0 0;font-family:Bitter,serif;font-size:13px;color:#b5ac95">Compartilhe esse código com os amigos.</p>
    </div>
    <div style="padding:22px 26px 26px">
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:center;gap:13px;background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:10px;padding:13px 15px">
          <div style="width:40px;height:40px;border-radius:50%;background:#E94E27;display:flex;align-items:center;justify-content:center;font-family:Anton,sans-serif;font-size:18px;color:#FBF9F2">MA</div>
          <div style="flex:1"><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:16px;color:#1C1A17">Marcão</div></div>
          <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:10px;letter-spacing:.12em;color:#1C1A17;background:#C7A24A;border-radius:4px;padding:4px 8px;text-transform:uppercase">Anfitrião</span>
        </div>
        <div style="display:flex;align-items:center;gap:13px;background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:10px;padding:13px 15px">
          <div style="width:40px;height:40px;border-radius:50%;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton,sans-serif;font-size:18px;color:#FBF9F2">JU</div>
          <div style="flex:1"><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:16px;color:#1C1A17">Juca</div></div>
          <span style="font-family:Bitter,serif;font-size:12px;color:#3f9c63">Pronto</span>
        </div>
        <div style="display:flex;align-items:center;gap:13px;background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:10px;padding:13px 15px">
          <div style="width:40px;height:40px;border-radius:50%;background:#3f9c63;display:flex;align-items:center;justify-content:center;font-family:Anton,sans-serif;font-size:18px;color:#FBF9F2">BI</div>
          <div style="flex:1"><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:16px;color:#1C1A17">Bia</div></div>
          <span style="font-family:Bitter,serif;font-size:12px;color:#3f9c63">Pronto</span>
        </div>
        <div style="display:flex;align-items:center;gap:13px;background:#FBF9F2;border:1.5px dashed #c3b896;border-radius:10px;padding:13px 15px;opacity:.7">
          <div style="width:40px;height:40px;border-radius:50%;border:1.5px dashed #b3a884;display:flex;align-items:center;justify-content:center;font-family:Anton,sans-serif;font-size:18px;color:#b3a884">TI</div>
          <div style="flex:1"><div style="font-family:Oswald,sans-serif;font-weight:500;font-size:15px;color:#8a8470">Tião</div></div>
          <span style="font-family:Bitter,serif;font-style:italic;font-size:12px;color:#8a8470">entrando…</span>
        </div>
      </div>

      <div style="margin-top:18px;display:flex;gap:8px">
        <div style="flex:1;background:#1C1A17;border-radius:8px;padding:12px 14px">
          <div style="font-family:Oswald,sans-serif;font-weight:500;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Formato</div>
          <div style="font-family:Anton,sans-serif;font-size:17px;color:#FBF9F2;margin-top:3px">Mata-mata</div>
        </div>
        <div style="flex:1;background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:8px;padding:12px 14px">
          <div style="font-family:Oswald,sans-serif;font-weight:500;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Rodadas</div>
          <div style="font-family:Anton,sans-serif;font-size:17px;color:#1C1A17;margin-top:3px">Ida e volta</div>
        </div>
      </div>

      <button style="margin-top:18px;width:100%;border:none;background:#E94E27;box-shadow:0 5px 0 #B43A1A;border-radius:8px;padding:18px;font-family:Anton,sans-serif;font-size:21px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Iniciar draft</button>
    </div>
  </div>
</div>

<!-- ============ FRAME 3 · DRAFT ============ -->
<div style="position:absolute;left:1000px;top:108px;width:392px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">03 · Draft — escolha de jogadores</div>
  <div style="background:#ECE4CF;border-radius:26px;box-shadow:0 12px 34px rgba(28,26,23,.18);overflow:hidden;width:392px;border:1px solid #d8cdaf">
    <div style="padding:22px 24px 18px;background:#FBF9F2;border-bottom:1.5px solid #d3c8aa">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">Draft · Rodada 3 de 8</span>
        <span style="display:flex;align-items:center;gap:6px;font-family:Anton,sans-serif;font-size:20px;color:#E94E27"><span style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">Tempo</span>0:18</span>
      </div>
      <div style="margin-top:10px;font-family:Anton,sans-serif;font-size:30px;color:#1C1A17;text-transform:uppercase">Sua vez, Marcão</div>
      <div style="margin-top:12px;display:flex;gap:5px;align-items:center">
        <span style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase;margin-right:4px">Ordem</span>
        <span style="width:22px;height:22px;border-radius:50%;background:#E94E27;color:#fff;font-family:Anton;font-size:11px;display:flex;align-items:center;justify-content:center">MA</span>
        <span style="width:22px;height:22px;border-radius:50%;background:#d3c8aa;color:#6c6657;font-family:Anton;font-size:11px;display:flex;align-items:center;justify-content:center">JU</span>
        <span style="width:22px;height:22px;border-radius:50%;background:#d3c8aa;color:#6c6657;font-family:Anton;font-size:11px;display:flex;align-items:center;justify-content:center">BI</span>
        <span style="width:22px;height:22px;border-radius:50%;background:#d3c8aa;color:#6c6657;font-family:Anton;font-size:11px;display:flex;align-items:center;justify-content:center">TI</span>
        <span style="font-family:Oswald;font-weight:500;font-size:11px;color:#8a8470;margin-left:4px">↺ volta</span>
      </div>
    </div>
    <div style="padding:18px 24px 24px">
      <div style="display:flex;flex-direction:column;gap:10px">
        <div style="background:#1C1A17;border-radius:12px;padding:14px 15px;display:flex;align-items:center;gap:13px;border:2px solid #C7A24A">
          <div style="width:46px;height:46px;border-radius:8px;background:#C7A24A;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1"><span style="font-family:Anton;font-size:20px;color:#1C1A17">10</span><span style="font-family:Oswald;font-weight:600;font-size:8px;letter-spacing:.08em;color:#1C1A17">MEI</span></div>
          <div style="flex:1">
            <div style="font-family:Anton;font-size:19px;color:#FBF9F2;text-transform:uppercase">Maradona</div>
            <div style="font-family:Oswald;font-weight:500;font-size:11px;letter-spacing:.06em;color:#b5ac95;text-transform:uppercase">Argentina · Copa 1986</div>
          </div>
          <div style="text-align:right"><div style="font-family:Anton;font-size:24px;color:#C7A24A">97</div><div style="font-family:Oswald;font-weight:600;font-size:8px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">Geral</div></div>
        </div>
        <div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:12px;padding:14px 15px;display:flex;align-items:center;gap:13px">
          <div style="width:46px;height:46px;border-radius:8px;background:#ECE4CF;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;border:1.5px solid #d3c8aa"><span style="font-family:Anton;font-size:20px;color:#1C1A17">9</span><span style="font-family:Oswald;font-weight:600;font-size:8px;letter-spacing:.08em;color:#8a8470">ATA</span></div>
          <div style="flex:1">
            <div style="font-family:Anton;font-size:19px;color:#1C1A17;text-transform:uppercase">Ronaldo</div>
            <div style="font-family:Oswald;font-weight:500;font-size:11px;letter-spacing:.06em;color:#8a8470;text-transform:uppercase">Brasil · Copa 2002</div>
          </div>
          <div style="text-align:right"><div style="font-family:Anton;font-size:24px;color:#1C1A17">95</div><div style="font-family:Oswald;font-weight:600;font-size:8px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">Geral</div></div>
        </div>
        <div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:12px;padding:14px 15px;display:flex;align-items:center;gap:13px">
          <div style="width:46px;height:46px;border-radius:8px;background:#ECE4CF;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1;border:1.5px solid #d3c8aa"><span style="font-family:Anton;font-size:20px;color:#1C1A17">7</span><span style="font-family:Oswald;font-weight:600;font-size:8px;letter-spacing:.08em;color:#8a8470">PNT</span></div>
          <div style="flex:1">
            <div style="font-family:Anton;font-size:19px;color:#1C1A17;text-transform:uppercase">Garrincha</div>
            <div style="font-family:Oswald;font-weight:500;font-size:11px;letter-spacing:.06em;color:#8a8470;text-transform:uppercase">Brasil · Copa 1962</div>
          </div>
          <div style="text-align:right"><div style="font-family:Anton;font-size:24px;color:#1C1A17">93</div><div style="font-family:Oswald;font-weight:600;font-size:8px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">Geral</div></div>
        </div>
      </div>

      <button style="margin-top:16px;width:100%;border:none;background:#E94E27;box-shadow:0 5px 0 #B43A1A;border-radius:8px;padding:17px;font-family:Anton,sans-serif;font-size:20px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Escolher Maradona</button>

      <div style="margin-top:18px;border-top:1.5px solid #d3c8aa;padding-top:14px">
        <div style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase;margin-bottom:9px">Seu elenco · 5/11</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#fff;border:1.5px solid #d3c8aa;border-radius:6px;padding:6px 9px">Pelé</span>
          <span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#fff;border:1.5px solid #d3c8aa;border-radius:6px;padding:6px 9px">Cafu</span>
          <span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#fff;border:1.5px solid #d3c8aa;border-radius:6px;padding:6px 9px">Baresi</span>
          <span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#fff;border:1.5px solid #d3c8aa;border-radius:6px;padding:6px 9px">Zidane</span>
          <span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#fff;border:1.5px solid #d3c8aa;border-radius:6px;padding:6px 9px">Yashin</span>
          <span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;background:transparent;border:1.5px dashed #c3b896;border-radius:6px;padding:6px 9px">+6</span>
        </div>
      </div>
    </div>
  </div>
</div>


<!-- ============ FRAME 4 · CAMPEONATO ============ -->
<div style="position:absolute;left:1460px;top:108px;width:392px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">04 · Campeonato — mata-mata</div>
  <div style="background:#ECE4CF;border-radius:26px;box-shadow:0 12px 34px rgba(28,26,23,.18);overflow:hidden;width:392px;border:1px solid #d8cdaf">
    <div style="padding:22px 24px 0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">Copa dos amigos</span>
        <span style="font-family:Anton;font-size:13px;letter-spacing:.06em;color:#1C1A17;text-transform:uppercase">Semifinal</span>
      </div>
      <div style="display:flex;gap:6px;margin-top:12px;background:#ded3b5;border-radius:9px;padding:4px">
        <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:12px;letter-spacing:.08em;color:#FBF9F2;background:#1C1A17;border-radius:6px;padding:9px;text-transform:uppercase">Chave</span>
        <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:12px;letter-spacing:.08em;color:#8a8470;padding:9px;text-transform:uppercase">Estatísticas</span>
      </div>
    </div>
    <div style="padding:16px 24px 8px">
      <div style="background:#1C1A17;border-radius:14px;padding:16px 18px;position:relative;overflow:hidden">
        <span style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.16em;color:#C7A24A;text-transform:uppercase">Próximo jogo · Semifinal</span>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px">
          <div style="display:flex;flex-direction:column;align-items:center;gap:7px;width:96px">
            <div style="width:46px;height:46px;border-radius:10px;background:#E94E27;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:20px;color:#fff">MA</div>
            <div style="font-family:Anton;font-size:13px;color:#FBF9F2;text-transform:uppercase;text-align:center;line-height:1">Marcão FC</div>
          </div>
          <div style="font-family:Anton;font-size:30px;color:#8a8470">VS</div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:7px;width:96px">
            <div style="width:46px;height:46px;border-radius:10px;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:20px;color:#fff">BI</div>
            <div style="font-family:Anton;font-size:13px;color:#FBF9F2;text-transform:uppercase;text-align:center;line-height:1">Bia United</div>
          </div>
        </div>
        <button style="margin-top:16px;width:100%;border:none;background:#E94E27;box-shadow:0 4px 0 #B43A1A;border-radius:8px;padding:15px;font-family:Anton,sans-serif;font-size:18px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Simular partida →</button>
      </div>
    </div>
    <div style="padding:8px 24px 26px">
      <div style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase;margin:8px 0 10px">Chaveamento</div>
      <div style="display:flex;gap:8px">
        <div style="flex:1">
          <div style="font-family:Oswald;font-weight:600;font-size:9px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase;margin-bottom:6px">Quartas</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:7px;padding:8px 9px"><div style="display:flex;justify-content:space-between"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17">Marcão</span><span style="font-family:Anton;font-size:12px;color:#E94E27">3</span></div><div style="display:flex;justify-content:space-between;opacity:.5;margin-top:3px"><span style="font-family:Oswald;font-weight:500;font-size:11px;color:#1C1A17">Juca</span><span style="font-family:Anton;font-size:12px;color:#1C1A17">1</span></div></div>
            <div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:7px;padding:8px 9px"><div style="display:flex;justify-content:space-between"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17">Bia</span><span style="font-family:Anton;font-size:12px;color:#E94E27">2</span></div><div style="display:flex;justify-content:space-between;opacity:.5;margin-top:3px"><span style="font-family:Oswald;font-weight:500;font-size:11px;color:#1C1A17">Tião</span><span style="font-family:Anton;font-size:12px;color:#1C1A17">0</span></div></div>
          </div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
          <div style="font-family:Oswald;font-weight:600;font-size:9px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase;margin-bottom:6px">Final</div>
          <div style="background:#ECE4CF;border:1.5px dashed #c3b896;border-radius:7px;padding:14px 9px;text-align:center"><span style="font-family:Bitter;font-style:italic;font-size:12px;color:#8a8470">aguardando</span></div>
        </div>
        <div style="flex:1">
          <div style="font-family:Oswald;font-weight:600;font-size:9px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase;margin-bottom:6px;text-align:right">Campeão</div>
          <div style="display:flex;flex-direction:column;justify-content:center;height:78px;align-items:center;border:1.5px solid #C7A24A;border-radius:7px;background:#faf3df"><div style="width:30px;height:30px;border-radius:50%;background:#C7A24A;opacity:.4"></div></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ FRAME 5 · CAMPEÃO ============ -->
<div style="position:absolute;left:1920px;top:108px;width:392px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">05 · Campeão — troféu</div>
  <div style="background:#1C1A17;border-radius:26px;box-shadow:0 12px 34px rgba(28,26,23,.28);overflow:hidden;width:392px;border:1px solid #2a2722;position:relative">
    <div style="position:absolute;top:40px;left:34px;width:7px;height:7px;background:#C7A24A;border-radius:1px;transform:rotate(20deg)"></div>
    <div style="position:absolute;top:80px;right:50px;width:9px;height:9px;background:#E94E27;border-radius:1px;transform:rotate(40deg)"></div>
    <div style="position:absolute;top:150px;left:60px;width:6px;height:6px;background:#FBF9F2;border-radius:50%"></div>
    <div style="position:absolute;top:120px;right:30px;width:6px;height:6px;background:#C7A24A;border-radius:50%"></div>
    <div style="position:absolute;top:220px;left:30px;width:8px;height:8px;background:#3f9c63;border-radius:1px;transform:rotate(15deg)"></div>
    <div style="padding:46px 26px 30px;text-align:center;position:relative">
      <span style="font-family:Oswald;font-weight:600;font-size:12px;letter-spacing:.3em;color:#C7A24A;text-transform:uppercase">Copa dos amigos · Campeão</span>
      <!-- trophy from simple shapes -->
      <div style="margin:26px auto 0;width:110px;height:130px;position:relative">
        <div style="position:absolute;left:23px;top:0;width:64px;height:62px;background:#C7A24A;border-radius:8px 8px 30px 30px"></div>
        <div style="position:absolute;left:2px;top:8px;width:22px;height:34px;border:5px solid #C7A24A;border-right:none;border-radius:16px 0 0 16px"></div>
        <div style="position:absolute;right:2px;top:8px;width:22px;height:34px;border:5px solid #C7A24A;border-left:none;border-radius:0 16px 16px 0"></div>
        <div style="position:absolute;left:46px;top:60px;width:18px;height:26px;background:#a8843a"></div>
        <div style="position:absolute;left:33px;top:86px;width:44px;height:12px;background:#C7A24A;border-radius:3px"></div>
        <div style="position:absolute;left:26px;top:98px;width:58px;height:14px;background:#a8843a;border-radius:3px"></div>
        <div style="position:absolute;left:38px;top:18px;width:34px;height:1px;font-family:Anton;font-size:22px;color:#1C1A17;text-align:center;line-height:0">7</div>
      </div>
      <div style="font-family:Anton;font-size:54px;color:#FBF9F2;text-transform:uppercase;margin-top:18px;line-height:.9">Marcão FC</div>
      <div style="font-family:Bitter;font-style:italic;font-size:15px;color:#b5ac95;margin-top:8px">Técnico: Marcão</div>
      <div style="margin-top:22px;display:flex;align-items:center;justify-content:center;gap:18px">
        <div style="text-align:center"><div style="font-family:Anton;font-size:30px;color:#FBF9F2">Marcão FC</div></div>
      </div>
      <div style="margin-top:16px;display:flex;gap:10px">
        <div style="flex:1;background:#26231e;border-radius:10px;padding:14px"><div style="font-family:Oswald;font-weight:600;font-size:9px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Final</div><div style="font-family:Anton;font-size:24px;color:#C7A24A;margin-top:3px">2 — 1</div></div>
        <div style="flex:1;background:#26231e;border-radius:10px;padding:14px"><div style="font-family:Oswald;font-weight:600;font-size:9px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Artilheiro</div><div style="font-family:Anton;font-size:18px;color:#FBF9F2;margin-top:5px">Ronaldo</div><div style="font-family:Oswald;font-weight:600;font-size:11px;color:#E94E27">8 gols</div></div>
      </div>
      <button style="margin-top:22px;width:100%;border:none;background:#E94E27;box-shadow:0 5px 0 #B43A1A;border-radius:8px;padding:17px;font-family:Anton,sans-serif;font-size:20px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Nova copa</button>
    </div>
  </div>
</div>

<!-- ============ SECTION B LABEL · MATCH ============ -->
<div data-drags-parent="0" style="position:absolute;left:80px;top:840px;font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.22em;color:#1C1A17;text-transform:uppercase">A tela-estrela · Partida 2D ao vivo</div>
<div style="position:absolute;left:80px;top:866px;font-family:Bitter,serif;font-size:13px;color:#6c6657;width:780px">Futebol de botão simulado em tempo real, placar estilo transmissão. O técnico pausa, substitui e muda o esquema durante o jogo.</div>

<!-- ============ FRAME 6 · PARTIDA 2D (cockpit) ============ -->
<div style="position:absolute;left:80px;top:912px;width:924px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">06 · Partida — simulação jogável</div>
  <div style="background:#161410;border-radius:20px;box-shadow:0 16px 44px rgba(28,26,23,.32);overflow:hidden;width:924px;border:1px solid #2a2722">
    <!-- broadcast top bar -->
    <div style="display:flex;align-items:stretch;background:#1C1A17;padding:14px 18px;gap:14px">
      <div style="display:flex;align-items:center;gap:11px;flex:1">
        <div style="width:40px;height:40px;border-radius:9px;background:#E94E27;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:17px;color:#fff">MA</div>
        <div><div style="font-family:Anton;font-size:18px;color:#FBF9F2;text-transform:uppercase;line-height:1">Marcão FC</div><div style="font-family:Oswald;font-weight:500;font-size:10px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">4-3-3 · Ofensivo</div></div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:190px">
        <div style="display:flex;align-items:center;gap:14px">
          <span style="font-family:Anton;font-size:42px;color:#FBF9F2;line-height:.9">2</span>
          <span style="font-family:Anton;font-size:24px;color:#C7A24A">—</span>
          <span style="font-family:Anton;font-size:42px;color:#FBF9F2;line-height:.9">1</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px;margin-top:3px"><span style="width:7px;height:7px;border-radius:50%;background:#E94E27;animation:fd-pulse 1.4s infinite"></span><span style="font-family:Oswald;font-weight:600;font-size:12px;letter-spacing:.12em;color:#E94E27;text-transform:uppercase">67' · 2º tempo</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:11px;flex:1;justify-content:flex-end">
        <div style="text-align:right"><div style="font-family:Anton;font-size:18px;color:#FBF9F2;text-transform:uppercase;line-height:1">Bia United</div><div style="font-family:Oswald;font-weight:500;font-size:10px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">4-4-2 · Equilibrado</div></div>
        <div style="width:40px;height:40px;border-radius:9px;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:17px;color:#fff">BI</div>
      </div>
    </div>

    <!-- main row: field + side panel -->
    <div style="display:flex;gap:16px;padding:16px">
      <!-- 2D FIELD -->
      <div style="position:relative;width:560px;height:372px;border-radius:12px;overflow:hidden;background:repeating-linear-gradient(90deg,#2f8050 0,#2f8050 56px,#2b7649 56px,#2b7649 112px);box-shadow:inset 0 0 0 3px rgba(255,255,255,.25)">
        <!-- lines -->
        <div style="position:absolute;left:50%;top:8px;bottom:8px;width:2px;background:rgba(255,255,255,.45);transform:translateX(-50%)"></div>
        <div style="position:absolute;left:50%;top:50%;width:78px;height:78px;border:2px solid rgba(255,255,255,.45);border-radius:50%;transform:translate(-50%,-50%)"></div>
        <div style="position:absolute;left:50%;top:50%;width:7px;height:7px;background:rgba(255,255,255,.6);border-radius:50%;transform:translate(-50%,-50%)"></div>
        <div style="position:absolute;left:8px;top:50%;width:64px;height:150px;border:2px solid rgba(255,255,255,.4);border-left:none;transform:translateY(-50%)"></div>
        <div style="position:absolute;right:8px;top:50%;width:64px;height:150px;border:2px solid rgba(255,255,255,.4);border-right:none;transform:translateY(-50%)"></div>
        <div style="position:absolute;left:8px;top:50%;width:26px;height:78px;border:2px solid rgba(255,255,255,.4);border-left:none;transform:translateY(-50%)"></div>
        <div style="position:absolute;right:8px;top:50%;width:26px;height:78px;border:2px solid rgba(255,255,255,.4);border-right:none;transform:translateY(-50%)"></div>
        <!-- RED team (left, attacking right) -->
        <div style="position:absolute;left:4%;top:50%;width:24px;height:24px;border-radius:50%;background:#C7A24A;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#1C1A17;transform:translate(-50%,-50%)">1</div>
        <div style="position:absolute;left:18%;top:18%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">2</div>
        <div style="position:absolute;left:17%;top:40%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">4</div>
        <div style="position:absolute;left:17%;top:60%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">3</div>
        <div style="position:absolute;left:18%;top:82%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">6</div>
        <div style="position:absolute;left:33%;top:28%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%);animation:fd-run 3s ease-in-out infinite">8</div>
        <div style="position:absolute;left:35%;top:50%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">5</div>
        <div style="position:absolute;left:33%;top:72%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">10</div>
        <div style="position:absolute;left:46%;top:30%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%);animation:fd-run 2.6s ease-in-out infinite">7</div>
        <div style="position:absolute;left:48%;top:48%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">9</div>
        <div style="position:absolute;left:45%;top:70%;width:24px;height:24px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">11</div>
        <!-- BLUE team (right) -->
        <div style="position:absolute;left:96%;top:50%;width:24px;height:24px;border-radius:50%;background:#1C1A17;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">1</div>
        <div style="position:absolute;left:82%;top:18%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">2</div>
        <div style="position:absolute;left:83%;top:40%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">4</div>
        <div style="position:absolute;left:83%;top:60%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">3</div>
        <div style="position:absolute;left:82%;top:82%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">6</div>
        <div style="position:absolute;left:67%;top:26%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">7</div>
        <div style="position:absolute;left:66%;top:44%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">8</div>
        <div style="position:absolute;left:66%;top:62%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">5</div>
        <div style="position:absolute;left:67%;top:80%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">11</div>
        <div style="position:absolute;left:55%;top:36%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">9</div>
        <div style="position:absolute;left:55%;top:64%;width:24px;height:24px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:11px;color:#fff;transform:translate(-50%,-50%)">10</div>
        <!-- ball -->
        <div style="position:absolute;left:50%;top:47%;width:13px;height:13px;border-radius:50%;background:#FBF9F2;border:1px solid #1C1A17;box-shadow:0 2px 6px rgba(0,0,0,.5);transform:translate(-50%,-50%);animation:fd-ball 1.6s ease-in-out infinite"></div>
        <!-- lower-third last event -->
        <div style="position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.7));padding:22px 14px 12px;display:flex;align-items:center;gap:10px">
          <span style="font-family:Anton;font-size:14px;color:#1C1A17;background:#C7A24A;border-radius:5px;padding:4px 9px">⚽ GOL</span>
          <span style="font-family:Oswald;font-weight:600;font-size:14px;color:#fff;letter-spacing:.02em">67' Ronaldo amplia para o Marcão FC!</span>
        </div>
      </div>

      <!-- SIDE PANEL -->
      <div style="width:300px;display:flex;flex-direction:column;gap:12px">
        <!-- tabs -->
        <div style="display:flex;gap:4px;background:#26231e;border-radius:9px;padding:4px">
          <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.06em;color:#8a8470;padding:8px;text-transform:uppercase;border-radius:6px">Lances</span>
          <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.06em;color:#1C1A17;background:#C7A24A;padding:8px;text-transform:uppercase;border-radius:6px">Tática</span>
          <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.06em;color:#8a8470;padding:8px;text-transform:uppercase;border-radius:6px">Banco</span>
        </div>
        <!-- tactics content -->
        <div style="background:#FBF9F2;border-radius:12px;padding:15px;flex:1">
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Postura</div>
          <div style="display:flex;gap:5px;margin-top:7px">
            <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:9px 0">Defensivo</span>
            <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:9px 0">Equilibrado</span>
            <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#fff;background:#E94E27;border-radius:6px;padding:9px 0">Ofensivo</span>
          </div>
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase;margin-top:15px">Linha defensiva</div>
          <div style="display:flex;gap:5px;margin-top:7px">
            <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:9px 0">Recuada</span>
            <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#C7A24A;border-radius:6px;padding:9px 0">Média</span>
            <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:9px 0">Alta</span>
          </div>
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase;margin-top:15px">Posse de bola</div>
          <div style="display:flex;justify-content:space-between;margin-top:7px"><span style="font-family:Bitter;font-size:11px;color:#8a8470">Toque a toque</span><span style="font-family:Bitter;font-size:11px;color:#8a8470">Direto</span></div>
          <div style="position:relative;height:6px;background:#ECE4CF;border-radius:3px;margin-top:6px"><div style="position:absolute;left:62%;top:50%;width:18px;height:18px;border-radius:50%;background:#1C1A17;transform:translate(-50%,-50%)"></div></div>
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase;margin-top:15px">Marcação</div>
          <div style="display:flex;gap:5px;margin-top:7px">
            <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:9px 0">Leve</span>
            <span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#fff;background:#E94E27;border-radius:6px;padding:9px 0">Pressão alta</span>
          </div>
        </div>
      </div>
    </div>

    <!-- bottom control bar -->
    <div style="display:flex;align-items:center;gap:10px;background:#1C1A17;padding:14px 18px;border-top:1px solid #2a2722">
      <button style="display:flex;align-items:center;gap:9px;border:none;background:#26231e;border-radius:9px;padding:13px 18px;cursor:pointer">
        <span style="display:flex;gap:3px"><span style="width:4px;height:14px;background:#C7A24A;border-radius:1px"></span><span style="width:4px;height:14px;background:#C7A24A;border-radius:1px"></span></span>
        <span style="font-family:Anton;font-size:15px;color:#FBF9F2;text-transform:uppercase">Pausa técnica</span>
      </button>
      <button style="display:flex;align-items:center;gap:9px;border:none;background:#26231e;border-radius:9px;padding:13px 18px;cursor:pointer">
        <span style="font-family:Oswald;font-weight:700;font-size:16px;color:#3f9c63">⇄</span>
        <span style="font-family:Anton;font-size:15px;color:#FBF9F2;text-transform:uppercase">Substituir</span>
        <span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#C7A24A;border-radius:4px;padding:2px 7px">3</span>
      </button>
      <div style="flex:1"></div>
      <span style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Velocidade</span>
      <div style="display:flex;gap:4px;background:#26231e;border-radius:8px;padding:4px">
        <span style="font-family:Anton;font-size:14px;color:#8a8470;padding:7px 12px;border-radius:5px">1×</span>
        <span style="font-family:Anton;font-size:14px;color:#1C1A17;background:#C7A24A;padding:7px 12px;border-radius:5px">2×</span>
        <span style="font-family:Anton;font-size:14px;color:#8a8470;padding:7px 12px;border-radius:5px">4×</span>
      </div>
    </div>
  </div>
</div>

<!-- ============ FRAME 7 · PÊNALTIS ============ -->
<div style="position:absolute;left:1044px;top:912px;width:392px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">07 · Pênaltis — decisão</div>
  <div style="background:#161410;border-radius:26px;box-shadow:0 16px 44px rgba(28,26,23,.32);overflow:hidden;width:392px;border:1px solid #2a2722">
    <div style="padding:24px 26px 18px;text-align:center">
      <span style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.26em;color:#E94E27;text-transform:uppercase">Disputa de pênaltis</span>
      <div style="display:flex;align-items:center;justify-content:center;gap:22px;margin-top:14px">
        <div style="text-align:center"><div style="font-family:Anton;font-size:15px;color:#FBF9F2;text-transform:uppercase">Marcão</div></div>
        <div style="display:flex;align-items:center;gap:12px"><span style="font-family:Anton;font-size:50px;color:#C7A24A;line-height:.9">3</span><span style="font-family:Anton;font-size:24px;color:#8a8470">—</span><span style="font-family:Anton;font-size:50px;color:#FBF9F2;line-height:.9">2</span></div>
        <div style="text-align:center"><div style="font-family:Anton;font-size:15px;color:#FBF9F2;text-transform:uppercase">Bia</div></div>
      </div>
    </div>
    <!-- mini goal -->
    <div style="margin:0 26px;height:128px;border-radius:12px;background:repeating-linear-gradient(90deg,#2f8050 0,#2f8050 28px,#2b7649 28px,#2b7649 56px);position:relative;overflow:hidden">
      <div style="position:absolute;left:50%;top:14px;width:150px;height:54px;border:4px solid #FBF9F2;border-bottom:none;border-radius:3px 3px 0 0;transform:translateX(-50%)"></div>
      <div style="position:absolute;left:50%;top:18px;width:30px;height:42px;background:#1C1A17;border-radius:4px;transform:translateX(-46px)"></div>
      <div style="position:absolute;left:50%;top:84px;width:13px;height:13px;border-radius:50%;background:#FBF9F2;border:1px solid #1C1A17;transform:translateX(-50%);box-shadow:0 2px 6px rgba(0,0,0,.5)"></div>
      <div style="position:absolute;left:0;right:0;bottom:8px;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.1em;color:#fff;text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,.8)">Cobrando: Maradona</div>
    </div>
    <div style="padding:18px 26px 24px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="width:30px;font-family:Oswald;font-weight:700;font-size:11px;color:#E94E27;text-transform:uppercase">MA</span>
        <div style="display:flex;gap:8px;flex:1">
          <span style="width:18px;height:18px;border-radius:50%;background:#3f9c63"></span>
          <span style="width:18px;height:18px;border-radius:50%;background:#3f9c63"></span>
          <span style="width:18px;height:18px;border-radius:50%;border:2px solid #E94E27;box-sizing:border-box"></span>
          <span style="width:18px;height:18px;border-radius:50%;background:#3f9c63"></span>
          <span style="width:18px;height:18px;border-radius:50%;border:2px solid #C7A24A;box-sizing:border-box;animation:fd-pulse 1.2s infinite"></span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span style="width:30px;font-family:Oswald;font-weight:700;font-size:11px;color:#2B5BA8;text-transform:uppercase">BI</span>
        <div style="display:flex;gap:8px;flex:1">
          <span style="width:18px;height:18px;border-radius:50%;background:#3f9c63"></span>
          <span style="width:18px;height:18px;border-radius:50%;border:2px solid #E94E27;box-sizing:border-box"></span>
          <span style="width:18px;height:18px;border-radius:50%;background:#3f9c63"></span>
          <span style="width:18px;height:18px;border-radius:50%;border:1.5px dashed #6c6657;box-sizing:border-box"></span>
          <span style="width:18px;height:18px;border-radius:50%;border:1.5px dashed #6c6657;box-sizing:border-box"></span>
        </div>
      </div>
      <div style="margin-top:18px;display:flex;gap:8px">
        <span style="flex:1;text-align:center;font-family:Anton;font-size:14px;color:#FBF9F2;background:#26231e;border-radius:8px;padding:13px 0;text-transform:uppercase">↖ Canto</span>
        <span style="flex:1;text-align:center;font-family:Anton;font-size:14px;color:#1C1A17;background:#C7A24A;border-radius:8px;padding:13px 0;text-transform:uppercase">↑ Meio</span>
        <span style="flex:1;text-align:center;font-family:Anton;font-size:14px;color:#FBF9F2;background:#26231e;border-radius:8px;padding:13px 0;text-transform:uppercase">↗ Canto</span>
      </div>
      <button style="margin-top:10px;width:100%;border:none;background:#E94E27;box-shadow:0 5px 0 #B43A1A;border-radius:8px;padding:16px;font-family:Anton,sans-serif;font-size:20px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Cobrar →</button>
    </div>
  </div>
</div>

<!-- ============ SECTION C LABEL · DIRECTION B ============ -->
<div data-drags-parent="0" style="position:absolute;left:80px;top:1620px;font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.22em;color:#1C1A17;text-transform:uppercase">Direção B · Estádio à noite</div>
<div style="position:absolute;left:80px;top:1646px;font-family:Bitter,serif;font-size:13px;color:#6c6657;width:780px">Mesma estrutura, clima noturno: base escura, verde-neon e luzes de estádio. Para você comparar com a Direção A.</div>

<!-- ============ FRAME 8 · HOME (B) ============ -->
<div style="position:absolute;left:80px;top:1700px;width:392px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">B · Início noturno</div>
  <div style="border-radius:26px;box-shadow:0 12px 34px rgba(0,0,0,.4);overflow:hidden;width:392px;background:radial-gradient(120% 70% at 50% 0%,#16332a 0%,#0c1712 55%,#080d0b 100%)">
    <div style="padding:30px 26px 28px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.2em;color:#39e08a;text-transform:uppercase">Copa entre amigos</span>
        <span style="font-family:Oswald;font-weight:500;font-size:11px;letter-spacing:.14em;color:#cfeede;text-transform:uppercase;border:1.5px solid #2c5a47;border-radius:20px;padding:5px 12px">Sem cadastro</span>
      </div>
      <div style="margin-top:38px;line-height:.8">
        <div style="font-family:Anton;font-size:84px;color:#FBF9F2;letter-spacing:-.01em">FUT</div>
        <div style="display:flex;align-items:flex-end;gap:14px"><div style="font-family:Anton;font-size:84px;color:#39e08a;letter-spacing:-.01em;text-shadow:0 0 24px rgba(57,224,138,.5)">DRAFT</div></div>
      </div>
      <div style="margin-top:18px;width:74px;height:11px;background:#39e08a;box-shadow:0 0 16px rgba(57,224,138,.6)"></div>
      <p style="margin:22px 0 0;font-family:Bitter,serif;font-size:16px;line-height:1.45;color:#9fc4b3;max-width:300px">Luzes acesas, gramado pronto. Crie a sala e chame a galera pro <strong style="color:#FBF9F2">draft</strong>.</p>
      <button style="margin-top:26px;width:100%;border:none;background:#39e08a;box-shadow:0 5px 0 #1f9a5c;border-radius:8px;padding:18px;font-family:Anton,sans-serif;font-size:22px;letter-spacing:.02em;color:#06120c;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px">Criar sala <span style="font-family:Oswald;font-weight:700">→</span></button>
      <div style="margin-top:14px;background:rgba(255,255,255,.05);border:2px solid #2c5a47;border-radius:8px;padding:6px 6px 6px 16px;display:flex;align-items:center;gap:10px">
        <span style="font-family:Oswald;font-weight:600;font-size:12px;letter-spacing:.1em;color:#6f9485;text-transform:uppercase">Código</span>
        <span style="font-family:Anton;font-size:24px;letter-spacing:.14em;color:#FBF9F2;flex:1">K7Q2</span>
        <button style="border:none;background:#0c1712;border:1.5px solid #39e08a;border-radius:6px;padding:12px 18px;font-family:Anton;font-size:15px;letter-spacing:.04em;color:#39e08a;text-transform:uppercase;cursor:pointer">Entrar</button>
      </div>
      <div style="margin-top:28px;display:flex;border-top:1px solid #1d3a2e;padding-top:18px">
        <div style="flex:1;border-right:1px solid #1d3a2e;padding-right:8px"><div style="font-family:Anton;font-size:26px;color:#39e08a">01</div><div style="font-family:Oswald;font-weight:600;font-size:13px;letter-spacing:.08em;color:#FBF9F2;text-transform:uppercase;margin-top:2px">Entre</div></div>
        <div style="flex:1;border-right:1px solid #1d3a2e;padding:0 8px"><div style="font-family:Anton;font-size:26px;color:#39e08a">02</div><div style="font-family:Oswald;font-weight:600;font-size:13px;letter-spacing:.08em;color:#FBF9F2;text-transform:uppercase;margin-top:2px">Drafte</div></div>
        <div style="flex:1;padding-left:8px"><div style="font-family:Anton;font-size:26px;color:#39e08a">03</div><div style="font-family:Oswald;font-weight:600;font-size:13px;letter-spacing:.08em;color:#FBF9F2;text-transform:uppercase;margin-top:2px">Simule</div></div>
      </div>
    </div>
  </div>
</div>

<!-- ============ FRAME 9 · PARTIDA (B) ============ -->
<div style="position:absolute;left:540px;top:1700px;width:620px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">B · Partida noturna</div>
  <div style="border-radius:20px;box-shadow:0 16px 44px rgba(0,0,0,.45);overflow:hidden;width:620px;background:#080d0b;border:1px solid #1d3a2e">
    <div style="display:flex;align-items:center;background:#0c1712;padding:14px 18px;gap:14px;border-bottom:1px solid #1d3a2e">
      <div style="display:flex;align-items:center;gap:10px;flex:1"><div style="width:36px;height:36px;border-radius:8px;background:#39e08a;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:15px;color:#06120c">MA</div><div style="font-family:Anton;font-size:16px;color:#FBF9F2;text-transform:uppercase">Marcão FC</div></div>
      <div style="display:flex;flex-direction:column;align-items:center"><div style="display:flex;align-items:center;gap:12px"><span style="font-family:Anton;font-size:38px;color:#FBF9F2">2</span><span style="font-family:Anton;font-size:20px;color:#39e08a">—</span><span style="font-family:Anton;font-size:38px;color:#FBF9F2">1</span></div><div style="display:flex;align-items:center;gap:6px;margin-top:2px"><span style="width:7px;height:7px;border-radius:50%;background:#39e08a;animation:fd-pulse 1.4s infinite"></span><span style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.12em;color:#39e08a;text-transform:uppercase">67'</span></div></div>
      <div style="display:flex;align-items:center;gap:10px;flex:1;justify-content:flex-end"><div style="font-family:Anton;font-size:16px;color:#FBF9F2;text-transform:uppercase">Bia United</div><div style="width:36px;height:36px;border-radius:8px;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:15px;color:#fff">BI</div></div>
    </div>
    <div style="padding:16px">
      <div style="position:relative;width:100%;height:300px;border-radius:12px;overflow:hidden;background:radial-gradient(80% 120% at 50% -10%,#1c4636 0%,#123127 60%,#0d241c 100%);box-shadow:inset 0 0 0 2px rgba(57,224,138,.3),inset 0 0 60px rgba(57,224,138,.08)">
        <div style="position:absolute;left:50%;top:8px;bottom:8px;width:2px;background:rgba(57,224,138,.4);transform:translateX(-50%)"></div>
        <div style="position:absolute;left:50%;top:50%;width:70px;height:70px;border:2px solid rgba(57,224,138,.4);border-radius:50%;transform:translate(-50%,-50%)"></div>
        <div style="position:absolute;left:8px;top:50%;width:54px;height:128px;border:2px solid rgba(57,224,138,.32);border-left:none;transform:translateY(-50%)"></div>
        <div style="position:absolute;right:8px;top:50%;width:54px;height:128px;border:2px solid rgba(57,224,138,.32);border-right:none;transform:translateY(-50%)"></div>
        <div style="position:absolute;left:5%;top:50%;width:22px;height:22px;border-radius:50%;background:#cfeede;border:2px solid #39e08a;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#06120c;transform:translate(-50%,-50%)">1</div>
        <div style="position:absolute;left:20%;top:24%;width:22px;height:22px;border-radius:50%;background:#39e08a;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#06120c;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(57,224,138,.6)">2</div>
        <div style="position:absolute;left:20%;top:52%;width:22px;height:22px;border-radius:50%;background:#39e08a;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#06120c;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(57,224,138,.6)">4</div>
        <div style="position:absolute;left:20%;top:78%;width:22px;height:22px;border-radius:50%;background:#39e08a;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#06120c;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(57,224,138,.6)">6</div>
        <div style="position:absolute;left:38%;top:36%;width:22px;height:22px;border-radius:50%;background:#39e08a;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#06120c;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(57,224,138,.6);animation:fd-run 3s ease-in-out infinite">8</div>
        <div style="position:absolute;left:38%;top:64%;width:22px;height:22px;border-radius:50%;background:#39e08a;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#06120c;transform:translate(-50%,-50%);box-shadow:0 0 12px rgba(57,224,138,.6)">10</div>
        <div style="position:absolute;left:48%;top:48%;width:22px;height:22px;border-radius:50%;background:#39e08a;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#06120c;transform:translate(-50%,-50%);box-shadow:0 0 16px rgba(57,224,138,.8);animation:fd-run 2.6s ease-in-out infinite">9</div>
        <div style="position:absolute;left:95%;top:50%;width:22px;height:22px;border-radius:50%;background:#1d2b4a;border:2px solid #6f8bd0;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#fff;transform:translate(-50%,-50%)">1</div>
        <div style="position:absolute;left:80%;top:28%;width:22px;height:22px;border-radius:50%;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#fff;transform:translate(-50%,-50%)">2</div>
        <div style="position:absolute;left:80%;top:72%;width:22px;height:22px;border-radius:50%;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#fff;transform:translate(-50%,-50%)">6</div>
        <div style="position:absolute;left:64%;top:38%;width:22px;height:22px;border-radius:50%;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#fff;transform:translate(-50%,-50%)">8</div>
        <div style="position:absolute;left:64%;top:62%;width:22px;height:22px;border-radius:50%;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#fff;transform:translate(-50%,-50%)">5</div>
        <div style="position:absolute;left:56%;top:50%;width:22px;height:22px;border-radius:50%;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:10px;color:#fff;transform:translate(-50%,-50%)">9</div>
        <div style="position:absolute;left:51%;top:45%;width:12px;height:12px;border-radius:50%;background:#FBF9F2;box-shadow:0 0 10px rgba(255,255,255,.9);transform:translate(-50%,-50%);animation:fd-ball 1.6s ease-in-out infinite"></div>
        <div style="position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.75));padding:24px 14px 12px;display:flex;align-items:center;gap:10px"><span style="font-family:Anton;font-size:13px;color:#06120c;background:#39e08a;border-radius:5px;padding:4px 9px;box-shadow:0 0 12px rgba(57,224,138,.6)">GOL</span><span style="font-family:Oswald;font-weight:600;font-size:13px;color:#fff">67' Ronaldo amplia!</span></div>
      </div>
      <div style="display:flex;align-items:center;gap:9px;margin-top:14px">
        <button style="display:flex;align-items:center;gap:8px;border:none;background:rgba(255,255,255,.06);border-radius:9px;padding:12px 16px;cursor:pointer"><span style="display:flex;gap:3px"><span style="width:4px;height:13px;background:#39e08a;border-radius:1px"></span><span style="width:4px;height:13px;background:#39e08a;border-radius:1px"></span></span><span style="font-family:Anton;font-size:14px;color:#FBF9F2;text-transform:uppercase">Pausa</span></button>
        <button style="display:flex;align-items:center;gap:8px;border:none;background:rgba(255,255,255,.06);border-radius:9px;padding:12px 16px;cursor:pointer"><span style="font-family:Oswald;font-weight:700;font-size:15px;color:#39e08a">⇄</span><span style="font-family:Anton;font-size:14px;color:#FBF9F2;text-transform:uppercase">Substituir</span></button>
        <button style="display:flex;align-items:center;gap:8px;border:none;background:rgba(255,255,255,.06);border-radius:9px;padding:12px 16px;cursor:pointer"><span style="font-family:Anton;font-size:14px;color:#FBF9F2;text-transform:uppercase">Tática</span></button>
        <div style="flex:1"></div>
        <div style="display:flex;gap:4px;background:rgba(255,255,255,.06);border-radius:8px;padding:4px"><span style="font-family:Anton;font-size:13px;color:#6f9485;padding:7px 11px">1×</span><span style="font-family:Anton;font-size:13px;color:#06120c;background:#39e08a;padding:7px 11px;border-radius:5px">2×</span></div>
      </div>
    </div>
  </div>
</div>

<!-- ============ SECTION D LABEL · DESKTOP ============ -->
<div data-drags-parent="0" style="position:absolute;left:80px;top:2360px;font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.22em;color:#1C1A17;text-transform:uppercase">Direção A · Desktop / Navegador — Fluxo completo</div>
<div style="position:absolute;left:80px;top:2386px;font-family:Bitter,serif;font-size:13px;color:#6c6657;width:820px">Mesma identidade do 7A0, agora em telas largas de navegador (1280px) aproveitando o espaço horizontal.</div>

<!-- ============ D1 · HOME DESKTOP ============ -->
<div style="position:absolute;left:80px;top:2444px;width:1320px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">D1 · Início</div>
  <div style="border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(28,26,23,.22);border:1px solid #d8cdaf;width:1320px;background:#fff">
    <div style="background:#1C1A17;padding:11px 16px;display:flex;align-items:center;gap:14px">
      <div style="display:flex;gap:7px"><span style="width:11px;height:11px;border-radius:50%;background:#E94E27"></span><span style="width:11px;height:11px;border-radius:50%;background:#C7A24A"></span><span style="width:11px;height:11px;border-radius:50%;background:#3f9c63"></span></div>
      <div style="flex:1;max-width:520px;background:#2a2722;border-radius:7px;padding:7px 14px;font-family:Oswald,sans-serif;font-weight:500;font-size:12px;color:#8a8470">futdraft.app</div>
    </div>
    <div style="background:#ECE4CF;display:flex;min-height:600px">
      <!-- left hero -->
      <div style="flex:1.25;padding:42px 52px;display:flex;flex-direction:column">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.2em;color:#1C1A17;text-transform:uppercase">FutDraft ⚽ · Copa entre amigos</span>
          <span style="font-family:Oswald,sans-serif;font-weight:500;font-size:12px;letter-spacing:.14em;color:#8a8470;text-transform:uppercase;border:1.5px solid #1C1A17;border-radius:20px;padding:7px 15px">Sem cadastro</span>
        </div>
        <div style="margin-top:auto;line-height:.78">
          <div style="font-family:Anton,sans-serif;font-size:148px;color:#1C1A17;letter-spacing:-.01em">FUT</div>
          <div style="display:flex;align-items:flex-end;gap:22px">
            <div style="font-family:Anton,sans-serif;font-size:148px;color:#1C1A17;letter-spacing:-.01em">DRAFT</div>
            <div style="width:30px;height:30px;border-radius:50%;background:#C7A24A;margin-bottom:24px;animation:fd-ball 2.4s ease-in-out infinite"></div>
          </div>
        </div>
        <div style="margin-top:22px;width:120px;height:14px;background:#E94E27"></div>
        <p style="margin:24px 0 auto;font-family:Bitter,serif;font-size:21px;line-height:1.45;color:#34302a;max-width:560px">Crie uma sala, compartilhe o código e montem os times num <strong>draft</strong> de craques de várias Copas. Depois é só assistir — e comandar — a simulação 2D ao vivo.</p>
        <div style="display:flex;border-top:1.5px solid #d3c8aa;padding-top:22px;margin-top:24px;gap:0">
          <div style="flex:1;border-right:1.5px solid #d3c8aa;padding-right:20px"><div style="font-family:Anton,sans-serif;font-size:34px;color:#E94E27">01</div><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:15px;letter-spacing:.06em;color:#1C1A17;text-transform:uppercase;margin-top:3px">Entre na sala</div><div style="font-family:Bitter,serif;font-size:13px;color:#6c6657;margin-top:3px">Só o nome de técnico e o código</div></div>
          <div style="flex:1;border-right:1.5px solid #d3c8aa;padding:0 20px"><div style="font-family:Anton,sans-serif;font-size:34px;color:#E94E27">02</div><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:15px;letter-spacing:.06em;color:#1C1A17;text-transform:uppercase;margin-top:3px">Drafte o time</div><div style="font-family:Bitter,serif;font-size:13px;color:#6c6657;margin-top:3px">Escolha craques em rodadas de ida e volta</div></div>
          <div style="flex:1;padding-left:20px"><div style="font-family:Anton,sans-serif;font-size:34px;color:#E94E27">03</div><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:15px;letter-spacing:.06em;color:#1C1A17;text-transform:uppercase;margin-top:3px">Simule a copa</div><div style="font-family:Bitter,serif;font-size:13px;color:#6c6657;margin-top:3px">Partidas 2D, pênaltis e troféu</div></div>
        </div>
      </div>
      <!-- right panel -->
      <div style="width:430px;background:#1C1A17;padding:48px 42px;display:flex;flex-direction:column;justify-content:center">
        <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#C7A24A;text-transform:uppercase">Comece agora</span>
        <button style="margin-top:20px;width:100%;border:none;background:#E94E27;box-shadow:0 6px 0 #B43A1A;border-radius:9px;padding:22px;font-family:Anton,sans-serif;font-size:27px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:12px">Criar sala <span style="font-family:Oswald;font-weight:700">→</span></button>
        <p style="margin:12px 0 0;font-family:Bitter,serif;font-size:13px;color:#8a8470;text-align:center">Você vira o anfitrião e comanda as simulações.</p>
        <div style="display:flex;align-items:center;gap:14px;margin:28px 0">
          <div style="flex:1;height:1px;background:#3a352e"></div><span style="font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.12em;color:#6c6657;text-transform:uppercase">ou entre num código</span><div style="flex:1;height:1px;background:#3a352e"></div>
        </div>
        <div style="background:#26231e;border:2px solid #3a352e;border-radius:9px;padding:7px 7px 7px 18px;display:flex;align-items:center;gap:10px">
          <span style="font-family:Anton,sans-serif;font-size:28px;letter-spacing:.18em;color:#FBF9F2;flex:1">K7Q2</span>
          <button style="border:none;background:#C7A24A;border-radius:7px;padding:15px 22px;font-family:Anton,sans-serif;font-size:17px;letter-spacing:.04em;color:#1C1A17;text-transform:uppercase;cursor:pointer">Entrar</button>
        </div>
        <div style="margin-top:14px;background:#26231e;border:2px solid #3a352e;border-radius:9px;padding:15px 18px"><span style="font-family:Oswald,sans-serif;font-weight:500;font-size:13px;color:#6c6657">Seu nome de técnico…</span></div>
      </div>
    </div>
  </div>
</div>

<!-- ============ D2 · LOBBY DESKTOP ============ -->
<div style="position:absolute;left:80px;top:3270px;width:1320px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">D2 · Lobby</div>
  <div style="border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(28,26,23,.22);border:1px solid #d8cdaf;width:1320px;background:#fff">
    <div style="background:#1C1A17;padding:11px 16px;display:flex;align-items:center;gap:14px">
      <div style="display:flex;gap:7px"><span style="width:11px;height:11px;border-radius:50%;background:#E94E27"></span><span style="width:11px;height:11px;border-radius:50%;background:#C7A24A"></span><span style="width:11px;height:11px;border-radius:50%;background:#3f9c63"></span></div>
      <div style="flex:1;max-width:520px;background:#2a2722;border-radius:7px;padding:7px 14px;font-family:Oswald,sans-serif;font-weight:500;font-size:12px;color:#8a8470">futdraft.app/sala/K7Q2</div>
    </div>
    <div style="background:#ECE4CF;padding:38px 48px;display:flex;gap:32px">
      <!-- left: code + settings -->
      <div style="width:380px;flex-shrink:0">
        <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.2em;color:#8a8470;text-transform:uppercase">Sala aberta · aguardando</span>
        <div style="background:#1C1A17;border-radius:14px;padding:28px;margin-top:14px">
          <div style="font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.16em;color:#C7A24A;text-transform:uppercase">Código da sala</div>
          <div style="font-family:Anton,sans-serif;font-size:76px;letter-spacing:.12em;color:#FBF9F2;line-height:1;margin-top:6px">K7Q2</div>
          <button style="margin-top:14px;width:100%;border:none;background:#26231e;border:1.5px solid #4a463e;border-radius:8px;padding:14px;font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.1em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Copiar link de convite</button>
        </div>
        <div style="display:flex;gap:10px;margin-top:14px">
          <div style="flex:1;background:#1C1A17;border-radius:10px;padding:15px 16px"><div style="font-family:Oswald,sans-serif;font-weight:500;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Formato</div><div style="font-family:Anton,sans-serif;font-size:19px;color:#FBF9F2;margin-top:3px">Mata-mata</div></div>
          <div style="flex:1;background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:10px;padding:15px 16px"><div style="font-family:Oswald,sans-serif;font-weight:500;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Draft</div><div style="font-family:Anton,sans-serif;font-size:19px;color:#1C1A17;margin-top:3px">Ida e volta</div></div>
        </div>
      </div>
      <!-- right: technicians -->
      <div style="flex:1">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-family:Anton,sans-serif;font-size:26px;color:#1C1A17;text-transform:uppercase">Técnicos na sala</span>
          <span style="display:flex;align-items:center;gap:7px;font-family:Oswald,sans-serif;font-weight:600;font-size:13px;letter-spacing:.1em;color:#1C1A17;text-transform:uppercase"><span style="width:9px;height:9px;border-radius:50%;background:#E94E27;animation:fd-pulse 1.4s infinite"></span>4 de 6</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
          <div style="display:flex;align-items:center;gap:14px;background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:12px;padding:16px 18px"><div style="width:46px;height:46px;border-radius:50%;background:#E94E27;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:19px;color:#FBF9F2">MA</div><div style="flex:1"><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:18px;color:#1C1A17">Marcão</div></div><span style="font-family:Oswald,sans-serif;font-weight:600;font-size:10px;letter-spacing:.1em;color:#1C1A17;background:#C7A24A;border-radius:5px;padding:5px 9px;text-transform:uppercase">Anfitrião</span></div>
          <div style="display:flex;align-items:center;gap:14px;background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:12px;padding:16px 18px"><div style="width:46px;height:46px;border-radius:50%;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:19px;color:#FBF9F2">JU</div><div style="flex:1"><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:18px;color:#1C1A17">Juca</div></div><span style="font-family:Bitter,serif;font-size:13px;color:#3f9c63">● Pronto</span></div>
          <div style="display:flex;align-items:center;gap:14px;background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:12px;padding:16px 18px"><div style="width:46px;height:46px;border-radius:50%;background:#3f9c63;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:19px;color:#FBF9F2">BI</div><div style="flex:1"><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:18px;color:#1C1A17">Bia</div></div><span style="font-family:Bitter,serif;font-size:13px;color:#3f9c63">● Pronto</span></div>
          <div style="display:flex;align-items:center;gap:14px;background:#FBF9F2;border:1.5px dashed #c3b896;border-radius:12px;padding:16px 18px;opacity:.7"><div style="width:46px;height:46px;border-radius:50%;border:1.5px dashed #b3a884;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:19px;color:#b3a884">TI</div><div style="flex:1"><div style="font-family:Oswald,sans-serif;font-weight:500;font-size:17px;color:#8a8470">Tião</div></div><span style="font-family:Bitter,serif;font-style:italic;font-size:13px;color:#8a8470">entrando…</span></div>
          <div style="display:flex;align-items:center;gap:14px;border:1.5px dashed #c3b896;border-radius:12px;padding:16px 18px;opacity:.5"><div style="width:46px;height:46px;border-radius:50%;border:1.5px dashed #b3a884;display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:700;font-size:22px;color:#b3a884">+</div><div style="flex:1"><div style="font-family:Bitter,serif;font-style:italic;font-size:14px;color:#8a8470">Vaga livre</div></div></div>
          <div style="display:flex;align-items:center;gap:14px;border:1.5px dashed #c3b896;border-radius:12px;padding:16px 18px;opacity:.5"><div style="width:46px;height:46px;border-radius:50%;border:1.5px dashed #b3a884;display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:700;font-size:22px;color:#b3a884">+</div><div style="flex:1"><div style="font-family:Bitter,serif;font-style:italic;font-size:14px;color:#8a8470">Vaga livre</div></div></div>
        </div>
        <button style="margin-top:18px;width:100%;border:none;background:#E94E27;box-shadow:0 6px 0 #B43A1A;border-radius:9px;padding:20px;font-family:Anton,sans-serif;font-size:24px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Iniciar draft →</button>
      </div>
    </div>
  </div>
</div>

<!-- ============ D3 · DRAFT DESKTOP ============ -->
<div style="position:absolute;left:80px;top:4030px;width:1320px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">D3 · Draft</div>
  <div style="border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(28,26,23,.22);border:1px solid #d8cdaf;width:1320px;background:#fff">
    <div style="background:#1C1A17;padding:11px 16px;display:flex;align-items:center;gap:14px">
      <div style="display:flex;gap:7px"><span style="width:11px;height:11px;border-radius:50%;background:#E94E27"></span><span style="width:11px;height:11px;border-radius:50%;background:#C7A24A"></span><span style="width:11px;height:11px;border-radius:50%;background:#3f9c63"></span></div>
      <div style="flex:1;max-width:520px;background:#2a2722;border-radius:7px;padding:7px 14px;font-family:Oswald,sans-serif;font-weight:500;font-size:12px;color:#8a8470">futdraft.app/sala/K7Q2/draft</div>
    </div>
    <!-- draft top bar -->
    <div style="background:#FBF9F2;border-bottom:1.5px solid #d3c8aa;padding:20px 40px;display:flex;align-items:center;gap:28px">
      <div><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.16em;color:#8a8470;text-transform:uppercase">Draft · Rodada 3 / 8 · ↺ volta</div><div style="font-family:Anton,sans-serif;font-size:32px;color:#1C1A17;text-transform:uppercase;margin-top:2px">Sua vez, Marcão</div></div>
      <div style="display:flex;gap:6px;align-items:center;margin-left:8px">
        <span style="width:30px;height:30px;border-radius:50%;background:#E94E27;color:#fff;font-family:Anton;font-size:13px;display:flex;align-items:center;justify-content:center">MA</span>
        <span style="width:30px;height:30px;border-radius:50%;background:#d3c8aa;color:#6c6657;font-family:Anton;font-size:13px;display:flex;align-items:center;justify-content:center">JU</span>
        <span style="width:30px;height:30px;border-radius:50%;background:#d3c8aa;color:#6c6657;font-family:Anton;font-size:13px;display:flex;align-items:center;justify-content:center">BI</span>
        <span style="width:30px;height:30px;border-radius:50%;background:#d3c8aa;color:#6c6657;font-family:Anton;font-size:13px;display:flex;align-items:center;justify-content:center">TI</span>
      </div>
      <div style="flex:1"></div>
      <div style="text-align:right"><div style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Tempo p/ escolher</div><div style="font-family:Anton,sans-serif;font-size:34px;color:#E94E27;line-height:1">0:18</div></div>
    </div>
    <div style="background:#ECE4CF;display:flex;gap:24px;padding:26px 36px">
      <!-- LEFT: rolled team + player list (estilo 7-0) -->
      <div style="width:320px;flex-shrink:0;display:flex;flex-direction:column">
        <div style="background:#fff;border-radius:10px;padding:20px 22px;box-shadow:0 4px 0 #d8cdaf">
          <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:10px;letter-spacing:.22em;color:#8a8470;text-transform:uppercase">Saiu</span>
          <div style="display:flex;align-items:baseline;gap:10px;margin-top:5px">
            <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:15px;color:#8a8470;text-transform:uppercase">AR</span>
            <span style="font-family:Anton;font-size:36px;color:#1C1A17;text-transform:uppercase;line-height:.9">Argentina</span>
          </div>
          <div style="font-family:Anton;font-size:23px;color:#E94E27;text-transform:uppercase;margin-top:3px">Copa 1986</div>
        </div>
        <div style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase;margin-top:16px">Não curtiu? Re-sorteie · 3 restantes</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button style="flex:1;border:2px solid #1C1A17;background:transparent;border-radius:7px;padding:11px;font-family:Anton;font-size:13px;color:#1C1A17;text-transform:uppercase;cursor:pointer">↺ Outra seleção</button>
          <button style="flex:1;border:2px solid #1C1A17;background:transparent;border-radius:7px;padding:11px;font-family:Anton;font-size:13px;color:#1C1A17;text-transform:uppercase;cursor:pointer">↺ Outra copa</button>
        </div>
        <div style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase;margin-top:18px;margin-bottom:9px">Escolha um jogador</div>
        <div style="background:#fff;border:1.5px solid #d3c8aa;border-radius:10px;overflow:hidden;flex:1">
          <div style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #ece4cf;opacity:.5"><span style="font-family:Oswald;font-weight:500;font-size:12px;color:#b3a884">#0</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:15px;color:#8a8470">Pumpido</span><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#b3a884;letter-spacing:.06em">GOL</span><span style="font-family:Anton;font-size:18px;color:#b3a884;width:30px;text-align:right">80</span></div>
          <div style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #ece4cf;background:#faf3df"><span style="font-family:Oswald;font-weight:500;font-size:12px;color:#8a8470">#10</span><span style="flex:1;font-family:Oswald;font-weight:700;font-size:15px;color:#1C1A17">Maradona</span><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#8a8470;letter-spacing:.06em">MEI</span><span style="font-family:Anton;font-size:18px;color:#E94E27;width:30px;text-align:right">97</span></div>
          <div style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #ece4cf"><span style="font-family:Oswald;font-weight:500;font-size:12px;color:#8a8470">#11</span><span style="flex:1;font-family:Oswald;font-weight:700;font-size:15px;color:#1C1A17">Valdano</span><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#8a8470;letter-spacing:.06em">CA</span><span style="font-family:Anton;font-size:18px;color:#1C1A17;width:30px;text-align:right">86</span></div>
          <div style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #ece4cf"><span style="font-family:Oswald;font-weight:500;font-size:12px;color:#8a8470">#7</span><span style="flex:1;font-family:Oswald;font-weight:700;font-size:15px;color:#1C1A17">Burruchaga</span><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#8a8470;letter-spacing:.06em">MC</span><span style="font-family:Anton;font-size:18px;color:#1C1A17;width:30px;text-align:right">84</span></div>
          <div style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #ece4cf"><span style="font-family:Oswald;font-weight:500;font-size:12px;color:#8a8470">#19</span><span style="flex:1;font-family:Oswald;font-weight:700;font-size:15px;color:#1C1A17">Giusti</span><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#8a8470;letter-spacing:.06em">VOL</span><span style="font-family:Anton;font-size:18px;color:#1C1A17;width:30px;text-align:right">82</span></div>
          <div style="display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid #ece4cf"><span style="font-family:Oswald;font-weight:500;font-size:12px;color:#8a8470">#5</span><span style="flex:1;font-family:Oswald;font-weight:700;font-size:15px;color:#1C1A17">Batista</span><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#8a8470;letter-spacing:.06em">VOL</span><span style="font-family:Anton;font-size:18px;color:#1C1A17;width:30px;text-align:right">80</span></div>
          <div style="display:flex;align-items:center;gap:10px;padding:13px 16px"><span style="font-family:Oswald;font-weight:500;font-size:12px;color:#8a8470">#9</span><span style="flex:1;font-family:Oswald;font-weight:700;font-size:15px;color:#1C1A17">Enrique</span><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#8a8470;letter-spacing:.06em">MC</span><span style="font-family:Anton;font-size:18px;color:#1C1A17;width:30px;text-align:right">79</span></div>
        </div>
        <button style="margin-top:14px;width:100%;border:none;background:#E94E27;box-shadow:0 6px 0 #B43A1A;border-radius:9px;padding:18px;font-family:Anton,sans-serif;font-size:22px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Escalar Maradona</button>
      </div>

      <!-- CENTER: pitch (estilo 7-0) -->
      <div style="flex:1;display:flex;flex-direction:column;align-items:center">
        <div style="position:relative;width:100%;max-width:470px;height:600px;border-radius:10px;overflow:hidden;background:repeating-linear-gradient(180deg,#357a4d 0,#357a4d 50px,#2f7146 50px,#2f7146 100px);box-shadow:inset 0 0 0 3px rgba(255,255,255,.22)">
          <!-- field lines -->
          <div style="position:absolute;left:10px;right:10px;top:50%;height:2px;background:rgba(255,255,255,.4);transform:translateY(-50%)"></div>
          <div style="position:absolute;left:50%;top:50%;width:120px;height:120px;border:2px solid rgba(255,255,255,.4);border-radius:50%;transform:translate(-50%,-50%)"></div>
          <div style="position:absolute;left:50%;top:50%;width:8px;height:8px;background:rgba(255,255,255,.55);border-radius:50%;transform:translate(-50%,-50%)"></div>
          <div style="position:absolute;left:50%;top:10px;width:200px;height:74px;border:2px solid rgba(255,255,255,.4);border-top:none;transform:translateX(-50%)"></div>
          <div style="position:absolute;left:50%;bottom:10px;width:200px;height:74px;border:2px solid rgba(255,255,255,.4);border-bottom:none;transform:translateX(-50%)"></div>
          <div style="position:absolute;left:50%;top:10px;width:96px;height:34px;border:2px solid rgba(255,255,255,.4);border-top:none;transform:translateX(-50%)"></div>
          <div style="position:absolute;left:50%;bottom:10px;width:96px;height:34px;border:2px solid rgba(255,255,255,.4);border-bottom:none;transform:translateX(-50%)"></div>
          <!-- CA (empty) -->
          <div style="position:absolute;left:50%;top:14%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:600;font-size:11px;color:rgba(255,255,255,.85)">CA</div></div>
          <!-- PE MEI PD (empty) -->
          <div style="position:absolute;left:18%;top:40%;display:flex;flex-direction:column;align-items:center"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:600;font-size:11px;color:rgba(255,255,255,.85)">PE</div></div>
          <div style="position:absolute;left:50%;top:38%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:600;font-size:11px;color:rgba(255,255,255,.85)">MEI</div></div>
          <div style="position:absolute;right:18%;top:40%;display:flex;flex-direction:column;align-items:center"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:600;font-size:11px;color:rgba(255,255,255,.85)">PD</div></div>
          <!-- VOL MC (empty) -->
          <div style="position:absolute;left:34%;top:57%;display:flex;flex-direction:column;align-items:center"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:600;font-size:11px;color:rgba(255,255,255,.85)">VOL</div></div>
          <div style="position:absolute;right:34%;top:57%;display:flex;flex-direction:column;align-items:center"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:600;font-size:11px;color:rgba(255,255,255,.85)">MC</div></div>
          <!-- LE (filled) -->
          <div style="position:absolute;left:13%;top:74%;display:flex;flex-direction:column;align-items:center"><div style="width:48px;height:48px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:19px;color:#1C1A17">6</div><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#fff;background:#1C1A17;border-radius:4px;padding:2px 6px;text-transform:uppercase;margin-top:3px">Altair</span></div>
          <!-- ZAG (filled) -->
          <div style="position:absolute;left:38%;top:78%;display:flex;flex-direction:column;align-items:center"><div style="width:48px;height:48px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:19px;color:#1C1A17">2</div><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#fff;background:#1C1A17;border-radius:4px;padding:2px 6px;text-transform:uppercase;margin-top:3px">Ruggeri</span></div>
          <!-- ZAG (empty) -->
          <div style="position:absolute;right:38%;top:78%;display:flex;flex-direction:column;align-items:center"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:600;font-size:11px;color:rgba(255,255,255,.85)">ZAG</div></div>
          <!-- LD (empty) -->
          <div style="position:absolute;right:13%;top:74%;display:flex;flex-direction:column;align-items:center"><div style="width:44px;height:44px;border-radius:50%;border:2px dashed rgba(255,255,255,.65);display:flex;align-items:center;justify-content:center;font-family:Oswald;font-weight:600;font-size:11px;color:rgba(255,255,255,.85)">LD</div></div>
          <!-- GOL (filled) -->
          <div style="position:absolute;left:50%;bottom:5%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center"><div style="width:48px;height:48px;border-radius:50%;background:#fff;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:19px;color:#1C1A17">3</div><span style="font-family:Oswald;font-weight:600;font-size:10px;color:#fff;background:#1C1A17;border-radius:4px;padding:2px 6px;text-transform:uppercase;margin-top:3px">Pumpido</span></div>
        </div>
        <div style="font-family:Bitter,serif;font-style:italic;font-size:13px;color:#8a8470;margin-top:10px">Toque num jogador pra mudar de posição</div>
      </div>

      <!-- RIGHT: box score (estilo 7-0) -->
      <div style="width:300px;flex-shrink:0">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <span style="font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.14em;color:#8a8470;text-transform:uppercase">Box score · 3/11</span>
          <span style="font-family:Anton;font-size:50px;color:#1C1A17;line-height:.75">79</span>
        </div>
        <div style="display:flex;align-items:center;gap:18px;margin-top:6px;border-bottom:1.5px solid #d3c8aa;padding-bottom:12px">
          <span style="display:flex;align-items:center;gap:7px"><span style="width:20px;height:3px;background:#E94E27"></span><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;text-transform:uppercase">Ataque</span><span style="font-family:Anton;font-size:17px;color:#1C1A17">22</span></span>
          <span style="display:flex;align-items:center;gap:7px"><span style="width:20px;height:3px;background:#1C1A17"></span><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;text-transform:uppercase">Defesa</span><span style="font-family:Anton;font-size:17px;color:#1C1A17">41</span></span>
        </div>
        <div style="margin-top:4px">
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#8a8470;width:34px;letter-spacing:.06em">GOL</span><span style="flex:1;font-family:Oswald;font-weight:600;font-size:14px;color:#1C1A17">Pumpido</span><span style="font-family:Anton;font-size:17px;color:#E94E27">80</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;width:34px;letter-spacing:.06em">LD</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:14px;color:#b3a884">—</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;width:34px;letter-spacing:.06em">ZAG</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:14px;color:#b3a884">—</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#8a8470;width:34px;letter-spacing:.06em">ZAG</span><span style="flex:1;font-family:Oswald;font-weight:600;font-size:14px;color:#1C1A17">Ruggeri</span><span style="font-family:Anton;font-size:17px;color:#E94E27">82</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#8a8470;width:34px;letter-spacing:.06em">LE</span><span style="flex:1;font-family:Oswald;font-weight:600;font-size:14px;color:#1C1A17">Altair</span><span style="font-family:Anton;font-size:17px;color:#E94E27">80</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;width:34px;letter-spacing:.06em">VOL</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:14px;color:#b3a884">—</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;width:34px;letter-spacing:.06em">MC</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:14px;color:#b3a884">—</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;width:34px;letter-spacing:.06em">PE</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:14px;color:#b3a884">—</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;width:34px;letter-spacing:.06em">MEI</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:14px;color:#b3a884">—</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid #ddd2b6"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;width:34px;letter-spacing:.06em">PD</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:14px;color:#b3a884">—</span></div>
          <div style="display:flex;align-items:center;gap:12px;padding:11px 2px"><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#b3a884;width:34px;letter-spacing:.06em">CA</span><span style="flex:1;font-family:Oswald;font-weight:500;font-size:14px;color:#b3a884">—</span></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ D4 · CAMPEONATO DESKTOP (bracket) ============ -->
<div style="position:absolute;left:80px;top:4980px;width:1320px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">D4 · Campeonato — chaveamento</div>
  <div style="border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(28,26,23,.22);border:1px solid #d8cdaf;width:1320px;background:#fff">
    <div style="background:#1C1A17;padding:11px 16px;display:flex;align-items:center;gap:14px">
      <div style="display:flex;gap:7px"><span style="width:11px;height:11px;border-radius:50%;background:#E94E27"></span><span style="width:11px;height:11px;border-radius:50%;background:#C7A24A"></span><span style="width:11px;height:11px;border-radius:50%;background:#3f9c63"></span></div>
      <div style="flex:1;max-width:520px;background:#2a2722;border-radius:7px;padding:7px 14px;font-family:Oswald,sans-serif;font-weight:500;font-size:12px;color:#8a8470">futdraft.app/sala/K7Q2/copa</div>
    </div>
    <div style="background:#ECE4CF;padding:32px 40px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
        <div><span style="font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">Copa dos amigos · mata-mata</span><div style="font-family:Anton,sans-serif;font-size:30px;color:#1C1A17;text-transform:uppercase;margin-top:2px">Chaveamento</div></div>
        <div style="display:flex;align-items:center;gap:16px;background:#1C1A17;border-radius:12px;padding:14px 22px">
          <span style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.14em;color:#C7A24A;text-transform:uppercase">Próximo · Semi</span>
          <span style="font-family:Anton;font-size:17px;color:#FBF9F2;text-transform:uppercase">Marcão</span><span style="font-family:Anton;font-size:15px;color:#8a8470">vs</span><span style="font-family:Anton;font-size:17px;color:#FBF9F2;text-transform:uppercase">Bia</span>
          <button style="border:none;background:#E94E27;border-radius:7px;padding:12px 20px;font-family:Anton;font-size:15px;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Simular →</button>
        </div>
      </div>
      <!-- bracket columns -->
      <div style="display:flex;align-items:center;gap:0">
        <!-- quarters -->
        <div style="flex:1">
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.14em;color:#8a8470;text-transform:uppercase;margin-bottom:12px">Quartas</div>
          <div style="display:flex;flex-direction:column;gap:30px">
            <div style="display:flex;flex-direction:column;gap:8px"><div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between"><span style="font-family:Oswald;font-weight:600;font-size:14px;color:#1C1A17">Marcão</span><span style="font-family:Anton;font-size:16px;color:#E94E27">3</span></div><div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;opacity:.55"><span style="font-family:Oswald;font-weight:500;font-size:14px;color:#1C1A17">Juca</span><span style="font-family:Anton;font-size:16px;color:#1C1A17">1</span></div></div>
            <div style="display:flex;flex-direction:column;gap:8px"><div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between"><span style="font-family:Oswald;font-weight:600;font-size:14px;color:#1C1A17">Bia</span><span style="font-family:Anton;font-size:16px;color:#E94E27">2</span></div><div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between;opacity:.55"><span style="font-family:Oswald;font-weight:500;font-size:14px;color:#1C1A17">Tião</span><span style="font-family:Anton;font-size:16px;color:#1C1A17">0</span></div></div>
          </div>
        </div>
        <div style="width:40px;height:2px;background:#d3c8aa"></div>
        <!-- semis -->
        <div style="flex:1">
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.14em;color:#8a8470;text-transform:uppercase;margin-bottom:12px">Semifinal</div>
          <div style="display:flex;flex-direction:column;gap:8px;border:2px solid #C7A24A;border-radius:10px;padding:10px;background:#faf3df"><div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between"><span style="font-family:Oswald;font-weight:600;font-size:14px;color:#1C1A17">Marcão</span><span style="font-family:Bitter;font-style:italic;font-size:12px;color:#8a8470">hoje</span></div><div style="background:#FBF9F2;border:1.5px solid #d3c8aa;border-radius:8px;padding:12px 14px;display:flex;justify-content:space-between"><span style="font-family:Oswald;font-weight:600;font-size:14px;color:#1C1A17">Bia</span><span style="font-family:Bitter;font-style:italic;font-size:12px;color:#8a8470">hoje</span></div></div>
        </div>
        <div style="width:40px;height:2px;background:#d3c8aa"></div>
        <!-- final -->
        <div style="flex:1">
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.14em;color:#8a8470;text-transform:uppercase;margin-bottom:12px">Final</div>
          <div style="display:flex;flex-direction:column;gap:8px"><div style="border:1.5px dashed #c3b896;border-radius:8px;padding:12px 14px"><span style="font-family:Bitter;font-style:italic;font-size:13px;color:#8a8470">vencedor semi</span></div><div style="border:1.5px dashed #c3b896;border-radius:8px;padding:12px 14px"><span style="font-family:Bitter;font-style:italic;font-size:13px;color:#8a8470">aguardando</span></div></div>
        </div>
        <div style="width:40px;height:2px;background:#d3c8aa"></div>
        <!-- champion -->
        <div style="flex:.8;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.14em;color:#8a8470;text-transform:uppercase;margin-bottom:12px">Campeão</div>
          <div style="width:88px;height:88px;border-radius:14px;border:2px solid #C7A24A;background:#faf3df;display:flex;align-items:center;justify-content:center"><div style="width:40px;height:40px;border-radius:50%;background:#C7A24A;opacity:.4"></div></div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- ============ D5 · PARTIDA 2D DESKTOP (star) ============ -->
<div style="position:absolute;left:80px;top:5650px;width:1320px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">D5 · Partida 2D ao vivo — a tela-estrela</div>
  <div style="border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(28,26,23,.3);border:1px solid #2a2722;width:1320px;background:#161410">
    <div style="background:#0c0b08;padding:11px 16px;display:flex;align-items:center;gap:14px">
      <div style="display:flex;gap:7px"><span style="width:11px;height:11px;border-radius:50%;background:#E94E27"></span><span style="width:11px;height:11px;border-radius:50%;background:#C7A24A"></span><span style="width:11px;height:11px;border-radius:50%;background:#3f9c63"></span></div>
      <div style="flex:1;max-width:520px;background:#2a2722;border-radius:7px;padding:7px 14px;font-family:Oswald,sans-serif;font-weight:500;font-size:12px;color:#8a8470">futdraft.app/sala/K7Q2/jogo · ao vivo</div>
    </div>
    <!-- broadcast scoreboard -->
    <div style="background:#1C1A17;display:flex;align-items:stretch;padding:18px 32px;gap:20px">
      <div style="display:flex;align-items:center;gap:14px;flex:1"><div style="width:48px;height:48px;border-radius:10px;background:#E94E27;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:20px;color:#fff">MA</div><div><div style="font-family:Anton;font-size:24px;color:#FBF9F2;text-transform:uppercase;line-height:1">Marcão FC</div><div style="font-family:Oswald;font-weight:500;font-size:11px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">4-3-3 · Ofensivo</div></div></div>
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:230px"><div style="display:flex;align-items:center;gap:18px"><span style="font-family:Anton;font-size:56px;color:#FBF9F2;line-height:.9">2</span><span style="font-family:Anton;font-size:30px;color:#C7A24A">—</span><span style="font-family:Anton;font-size:56px;color:#FBF9F2;line-height:.9">1</span></div><div style="display:flex;align-items:center;gap:8px;margin-top:4px"><span style="width:8px;height:8px;border-radius:50%;background:#E94E27;animation:fd-pulse 1.4s infinite"></span><span style="font-family:Oswald;font-weight:600;font-size:13px;letter-spacing:.14em;color:#E94E27;text-transform:uppercase">67' · 2º tempo</span></div></div>
      <div style="display:flex;align-items:center;gap:14px;flex:1;justify-content:flex-end"><div style="text-align:right"><div style="font-family:Anton;font-size:24px;color:#FBF9F2;text-transform:uppercase;line-height:1">Bia United</div><div style="font-family:Oswald;font-weight:500;font-size:11px;letter-spacing:.1em;color:#8a8470;text-transform:uppercase">4-4-2 · Equilibrado</div></div><div style="width:48px;height:48px;border-radius:10px;background:#2B5BA8;display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:20px;color:#fff">BI</div></div>
    </div>
    <!-- main: events | field | tactics -->
    <div style="display:flex;gap:18px;padding:20px 24px">
      <!-- events feed -->
      <div style="width:248px;flex-shrink:0;display:flex;flex-direction:column">
        <div style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.14em;color:#8a8470;text-transform:uppercase;margin-bottom:12px">Lances</div>
        <div style="display:flex;flex-direction:column;gap:9px">
          <div style="display:flex;gap:11px;align-items:flex-start"><span style="font-family:Anton;font-size:13px;color:#C7A24A;width:30px;flex-shrink:0">67'</span><div><span style="font-family:Anton;font-size:13px;color:#1C1A17;background:#C7A24A;border-radius:4px;padding:2px 7px;text-transform:uppercase">⚽ Gol</span><div style="font-family:Bitter;font-size:13px;color:#cfc6b0;margin-top:4px">Ronaldo amplia para o Marcão!</div></div></div>
          <div style="display:flex;gap:11px;align-items:flex-start"><span style="font-family:Anton;font-size:13px;color:#8a8470;width:30px;flex-shrink:0">61'</span><div><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#C7A24A;text-transform:uppercase">⬔ Amarelo</span><div style="font-family:Bitter;font-size:13px;color:#9a927e;margin-top:3px">Baresi — falta dura no meio.</div></div></div>
          <div style="display:flex;gap:11px;align-items:flex-start"><span style="font-family:Anton;font-size:13px;color:#8a8470;width:30px;flex-shrink:0">58'</span><div><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#3f9c63;text-transform:uppercase">⇄ Substituição</span><div style="font-family:Bitter;font-size:13px;color:#9a927e;margin-top:3px">Bia: entra Romário, sai Bebeto.</div></div></div>
          <div style="display:flex;gap:11px;align-items:flex-start"><span style="font-family:Anton;font-size:13px;color:#8a8470;width:30px;flex-shrink:0">45'</span><div><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#2B5BA8;text-transform:uppercase">⚽ Gol Bia</span><div style="font-family:Bitter;font-size:13px;color:#9a927e;margin-top:3px">Empate de Romário antes do intervalo.</div></div></div>
          <div style="display:flex;gap:11px;align-items:flex-start"><span style="font-family:Anton;font-size:13px;color:#8a8470;width:30px;flex-shrink:0">23'</span><div><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#E94E27;text-transform:uppercase">⚽ Gol Marcão</span><div style="font-family:Bitter;font-size:13px;color:#9a927e;margin-top:3px">Pelé abre o placar de cabeça.</div></div></div>
        </div>
      </div>
      <!-- FIELD -->
      <div style="flex:1;position:relative;height:460px;border-radius:14px;overflow:hidden;background:repeating-linear-gradient(90deg,#2f8050 0,#2f8050 64px,#2b7649 64px,#2b7649 128px);box-shadow:inset 0 0 0 3px rgba(255,255,255,.25)">
        <div style="position:absolute;left:50%;top:10px;bottom:10px;width:2px;background:rgba(255,255,255,.45);transform:translateX(-50%)"></div>
        <div style="position:absolute;left:50%;top:50%;width:96px;height:96px;border:2px solid rgba(255,255,255,.45);border-radius:50%;transform:translate(-50%,-50%)"></div>
        <div style="position:absolute;left:50%;top:50%;width:8px;height:8px;background:rgba(255,255,255,.6);border-radius:50%;transform:translate(-50%,-50%)"></div>
        <div style="position:absolute;left:10px;top:50%;width:82px;height:200px;border:2px solid rgba(255,255,255,.4);border-left:none;transform:translateY(-50%)"></div>
        <div style="position:absolute;right:10px;top:50%;width:82px;height:200px;border:2px solid rgba(255,255,255,.4);border-right:none;transform:translateY(-50%)"></div>
        <div style="position:absolute;left:10px;top:50%;width:32px;height:100px;border:2px solid rgba(255,255,255,.4);border-left:none;transform:translateY(-50%)"></div>
        <div style="position:absolute;right:10px;top:50%;width:32px;height:100px;border:2px solid rgba(255,255,255,.4);border-right:none;transform:translateY(-50%)"></div>
        <!-- RED -->
        <div style="position:absolute;left:4%;top:50%;width:30px;height:30px;border-radius:50%;background:#C7A24A;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#1C1A17;transform:translate(-50%,-50%)">1</div>
        <div style="position:absolute;left:18%;top:18%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">2</div>
        <div style="position:absolute;left:17%;top:40%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">4</div>
        <div style="position:absolute;left:17%;top:60%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">3</div>
        <div style="position:absolute;left:18%;top:82%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">6</div>
        <div style="position:absolute;left:33%;top:28%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%);animation:fd-run 3s ease-in-out infinite">8</div>
        <div style="position:absolute;left:35%;top:50%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">5</div>
        <div style="position:absolute;left:33%;top:72%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">10</div>
        <div style="position:absolute;left:46%;top:30%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%);animation:fd-run 2.6s ease-in-out infinite">7</div>
        <div style="position:absolute;left:48%;top:48%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">9</div>
        <div style="position:absolute;left:45%;top:70%;width:30px;height:30px;border-radius:50%;background:#E94E27;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">11</div>
        <!-- BLUE -->
        <div style="position:absolute;left:96%;top:50%;width:30px;height:30px;border-radius:50%;background:#1C1A17;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">1</div>
        <div style="position:absolute;left:82%;top:18%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">2</div>
        <div style="position:absolute;left:83%;top:40%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">4</div>
        <div style="position:absolute;left:83%;top:60%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">3</div>
        <div style="position:absolute;left:82%;top:82%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">6</div>
        <div style="position:absolute;left:67%;top:26%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">7</div>
        <div style="position:absolute;left:66%;top:44%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">8</div>
        <div style="position:absolute;left:66%;top:62%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">5</div>
        <div style="position:absolute;left:67%;top:80%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">11</div>
        <div style="position:absolute;left:55%;top:36%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">9</div>
        <div style="position:absolute;left:55%;top:64%;width:30px;height:30px;border-radius:50%;background:#2B5BA8;border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-family:Anton;font-size:13px;color:#fff;transform:translate(-50%,-50%)">10</div>
        <!-- ball -->
        <div style="position:absolute;left:50%;top:47%;width:16px;height:16px;border-radius:50%;background:#FBF9F2;border:1px solid #1C1A17;box-shadow:0 2px 7px rgba(0,0,0,.5);transform:translate(-50%,-50%);animation:fd-ball 1.6s ease-in-out infinite"></div>
        <!-- lower third -->
        <div style="position:absolute;left:0;right:0;bottom:0;background:linear-gradient(transparent,rgba(0,0,0,.72));padding:30px 18px 14px;display:flex;align-items:center;gap:12px"><span style="font-family:Anton;font-size:16px;color:#1C1A17;background:#C7A24A;border-radius:6px;padding:5px 11px">⚽ GOL</span><span style="font-family:Oswald;font-weight:600;font-size:17px;color:#fff;letter-spacing:.02em">67' Ronaldo amplia para o Marcão FC!</span></div>
      </div>
      <!-- tactics + bench -->
      <div style="width:268px;flex-shrink:0;display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;gap:4px;background:#26231e;border-radius:9px;padding:4px"><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#C7A24A;padding:9px;text-transform:uppercase;border-radius:6px">Tática</span><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#8a8470;padding:9px;text-transform:uppercase">Banco</span></div>
        <div style="background:#FBF9F2;border-radius:12px;padding:16px;flex:1">
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Postura</div>
          <div style="display:flex;gap:5px;margin-top:7px"><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:10px 0">Def</span><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:10px 0">Equil</span><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#fff;background:#E94E27;border-radius:6px;padding:10px 0">Ofens</span></div>
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase;margin-top:15px">Linha defensiva</div>
          <div style="display:flex;gap:5px;margin-top:7px"><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:10px 0">Recuada</span><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#C7A24A;border-radius:6px;padding:10px 0">Média</span><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:10px 0">Alta</span></div>
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase;margin-top:15px">Posse de bola</div>
          <div style="display:flex;justify-content:space-between;margin-top:7px"><span style="font-family:Bitter;font-size:11px;color:#8a8470">Toque a toque</span><span style="font-family:Bitter;font-size:11px;color:#8a8470">Direto</span></div>
          <div style="position:relative;height:6px;background:#ECE4CF;border-radius:3px;margin-top:6px"><div style="position:absolute;left:62%;top:50%;width:18px;height:18px;border-radius:50%;background:#1C1A17;transform:translate(-50%,-50%)"></div></div>
          <div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase;margin-top:15px">Marcação</div>
          <div style="display:flex;gap:5px;margin-top:7px"><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#6c6657;background:#ECE4CF;border-radius:6px;padding:10px 0">Leve</span><span style="flex:1;text-align:center;font-family:Oswald;font-weight:600;font-size:11px;color:#fff;background:#E94E27;border-radius:6px;padding:10px 0">Pressão alta</span></div>
        </div>
      </div>
    </div>
    <!-- control bar -->
    <div style="display:flex;align-items:center;gap:12px;background:#1C1A17;padding:16px 24px;border-top:1px solid #2a2722">
      <button style="display:flex;align-items:center;gap:10px;border:none;background:#26231e;border-radius:9px;padding:14px 20px;cursor:pointer"><span style="display:flex;gap:3px"><span style="width:4px;height:15px;background:#C7A24A;border-radius:1px"></span><span style="width:4px;height:15px;background:#C7A24A;border-radius:1px"></span></span><span style="font-family:Anton;font-size:16px;color:#FBF9F2;text-transform:uppercase">Pausa técnica</span></button>
      <button style="display:flex;align-items:center;gap:10px;border:none;background:#26231e;border-radius:9px;padding:14px 20px;cursor:pointer"><span style="font-family:Oswald;font-weight:700;font-size:17px;color:#3f9c63">⇄</span><span style="font-family:Anton;font-size:16px;color:#FBF9F2;text-transform:uppercase">Substituir</span><span style="font-family:Oswald;font-weight:600;font-size:11px;color:#1C1A17;background:#C7A24A;border-radius:4px;padding:2px 8px">3</span></button>
      <button style="display:flex;align-items:center;gap:10px;border:none;background:#26231e;border-radius:9px;padding:14px 20px;cursor:pointer"><span style="font-family:Anton;font-size:16px;color:#FBF9F2;text-transform:uppercase">Esquema</span></button>
      <div style="flex:1"></div>
      <span style="font-family:Oswald;font-weight:600;font-size:11px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Velocidade</span>
      <div style="display:flex;gap:4px;background:#26231e;border-radius:8px;padding:4px"><span style="font-family:Anton;font-size:15px;color:#8a8470;padding:8px 14px;border-radius:5px">1×</span><span style="font-family:Anton;font-size:15px;color:#1C1A17;background:#C7A24A;padding:8px 14px;border-radius:5px">2×</span><span style="font-family:Anton;font-size:15px;color:#8a8470;padding:8px 14px;border-radius:5px">4×</span></div>
    </div>
  </div>
</div>

<!-- ============ D6 · CAMPEÃO DESKTOP ============ -->
<div style="position:absolute;left:80px;top:6720px;width:1320px">
  <div data-drags-parent="1" style="position:absolute;top:-24px;font-family:Oswald,sans-serif;font-weight:600;font-size:12px;letter-spacing:.18em;color:#8a8470;text-transform:uppercase">D6 · Campeão</div>
  <div style="border-radius:14px;overflow:hidden;box-shadow:0 18px 50px rgba(28,26,23,.3);border:1px solid #2a2722;width:1320px;background:#161410">
    <div style="background:#0c0b08;padding:11px 16px;display:flex;align-items:center;gap:14px">
      <div style="display:flex;gap:7px"><span style="width:11px;height:11px;border-radius:50%;background:#E94E27"></span><span style="width:11px;height:11px;border-radius:50%;background:#C7A24A"></span><span style="width:11px;height:11px;border-radius:50%;background:#3f9c63"></span></div>
      <div style="flex:1;max-width:520px;background:#2a2722;border-radius:7px;padding:7px 14px;font-family:Oswald,sans-serif;font-weight:500;font-size:12px;color:#8a8470">futdraft.app/sala/K7Q2/campeao</div>
    </div>
    <div style="background:radial-gradient(120% 90% at 50% 0%,#26231e 0%,#161410 60%);padding:48px 56px;display:flex;align-items:center;gap:56px;position:relative;overflow:hidden">
      <div style="position:absolute;top:40px;left:30%;width:9px;height:9px;background:#C7A24A;border-radius:1px;transform:rotate(20deg)"></div>
      <div style="position:absolute;top:90px;right:30%;width:10px;height:10px;background:#E94E27;border-radius:1px;transform:rotate(40deg)"></div>
      <div style="position:absolute;bottom:50px;left:42%;width:8px;height:8px;background:#3f9c63;border-radius:50%"></div>
      <div style="position:absolute;top:130px;right:18%;width:7px;height:7px;background:#FBF9F2;border-radius:50%"></div>
      <!-- trophy -->
      <div style="flex-shrink:0;text-align:center">
        <div style="margin:0 auto;width:150px;height:178px;position:relative">
          <div style="position:absolute;left:31px;top:0;width:88px;height:84px;background:#C7A24A;border-radius:10px 10px 40px 40px"></div>
          <div style="position:absolute;left:0;top:12px;width:30px;height:46px;border:7px solid #C7A24A;border-right:none;border-radius:22px 0 0 22px"></div>
          <div style="position:absolute;right:0;top:12px;width:30px;height:46px;border:7px solid #C7A24A;border-left:none;border-radius:0 22px 22px 0"></div>
          <div style="position:absolute;left:62px;top:82px;width:26px;height:36px;background:#a8843a"></div>
          <div style="position:absolute;left:45px;top:118px;width:60px;height:16px;background:#C7A24A;border-radius:4px"></div>
          <div style="position:absolute;left:35px;top:134px;width:80px;height:18px;background:#a8843a;border-radius:4px"></div>
          <div style="position:absolute;left:0;top:24px;width:150px;text-align:center;font-family:Anton;font-size:30px;color:#1C1A17">7</div>
        </div>
      </div>
      <!-- text -->
      <div style="flex:1">
        <span style="font-family:Oswald;font-weight:600;font-size:13px;letter-spacing:.3em;color:#C7A24A;text-transform:uppercase">Copa dos amigos · Campeão</span>
        <div style="font-family:Anton;font-size:84px;color:#FBF9F2;text-transform:uppercase;line-height:.88;margin-top:10px">Marcão FC</div>
        <div style="font-family:Bitter;font-style:italic;font-size:18px;color:#b5ac95;margin-top:10px">Técnico: Marcão · invicto na campanha</div>
        <div style="display:flex;gap:14px;margin-top:28px">
          <div style="background:#26231e;border-radius:12px;padding:18px 24px"><div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Placar da final</div><div style="font-family:Anton;font-size:32px;color:#C7A24A;margin-top:4px">2 — 1</div></div>
          <div style="background:#26231e;border-radius:12px;padding:18px 24px"><div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Artilheiro</div><div style="font-family:Anton;font-size:22px;color:#FBF9F2;margin-top:6px">Ronaldo · <span style="color:#E94E27">8 gols</span></div></div>
          <div style="background:#26231e;border-radius:12px;padding:18px 24px"><div style="font-family:Oswald;font-weight:600;font-size:10px;letter-spacing:.12em;color:#8a8470;text-transform:uppercase">Campanha</div><div style="font-family:Anton;font-size:22px;color:#FBF9F2;margin-top:6px">4V · 0D</div></div>
        </div>
        <div style="display:flex;gap:12px;margin-top:28px">
          <button style="border:none;background:#E94E27;box-shadow:0 6px 0 #B43A1A;border-radius:9px;padding:18px 32px;font-family:Anton,sans-serif;font-size:21px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Nova copa</button>
          <button style="border:1.5px solid #4a463e;background:transparent;border-radius:9px;padding:18px 32px;font-family:Anton,sans-serif;font-size:21px;letter-spacing:.02em;color:#FBF9F2;text-transform:uppercase;cursor:pointer">Ver tabela</button>
        </div>
      </div>
    </div>
  </div>
</div>
</x-dc>
</body>
</html>
