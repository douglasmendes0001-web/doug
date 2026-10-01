# Gera src/engine/data/habilidades.ts: banco de texto de habilidades por posição.
# Cada habilidade = base (com efeito no motor) + condição em que ela rende mais.
G = [
 ("Reflexo felino","gk"),("Posicionamento","gk"),("Especialista em pênalti","pen"),("Defesa difícil","gk"),
 ("Saída do gol","gkout"),("Jogo aéreo","gkair"),("Reposição rápida com as mãos","build"),("Lançamento com os pés","build"),
 ("Comando de área","lead"),("Defesa com os pés","gk"),("Mano a mano","gkout"),("Encaixe seguro","gk"),
 ("Elasticidade","gk"),("Leitura de jogo","gkout"),("Frieza nos pênaltis","pen"),("Ponte espetacular","gk"),
 ("Defesa de chute de longe","gk"),("Antecipação de cruzamentos","gkair"),("Defesa à queima-roupa","gk"),("Rebote seguro","gk"),
 ("Goleiro-líbero","gkout"),("Concentração total","gk"),("Coragem nas divididas","gkout"),("Psicológico de pênalti","pen"),
 ("Agilidade de reação","gk"),("Voz de comando","lead"),
]
ZG = [
 ("Desarme limpo","def"),("Marcação implacável","def"),("Cabeceio defensivo","def"),("Cabeceio ofensivo","head"),
 ("Antecipação","def"),("Cobertura","def"),("Saída de bola","pass"),("Lançamento longo","pass"),
 ("Velocidade de recuperação","def"),("Bloqueio de chutes","def"),("Força no corpo a corpo","def"),("Liderança da zaga","lead"),
 ("Leitura de jogo","def"),("Carrinho preciso","def"),("Jogo aéreo dominante","head"),("Gol de bola parada","head"),
 ("Posicionamento defensivo","def"),("Disciplina tática","card"),("Frieza sob pressão","def"),("Condução de bola","pass"),
 ("Passe vertical","pass"),("Resistência física","stamina"),("Impulsão","head"),("Marcação de área","def"),
 ("Interceptação","def"),("Raça","lead"),
]
LAT = [
 ("Cruzamento preciso","cross"),("Apoio ao ataque","cross"),("Velocidade na ponta","speed"),("Marcação de ponta","def"),
 ("Desarme","def"),("Resistência","stamina"),("Ultrapassagem","cross"),("Cruzamento rasteiro","cross"),
 ("Recomposição rápida","def"),("Chute cruzado","shot"),("Tabelinha","pass"),("Drible curto","drib"),
 ("Fôlego de maratonista","stamina"),("Cobertura do zagueiro","def"),("Lançamento diagonal","pass"),("Inversão de jogo","pass"),
 ("Jogo por dentro","pass"),("Arrancada","speed"),("Bloqueio de cruzamento","def"),("Posicionamento defensivo","def"),
 ("Lateral longo na área","cross"),("Infiltração","shot"),("Bola parada","cross"),("Antecipação","def"),
 ("Duelo físico","def"),("Disciplina tática","card"),
]
VOL = [
 ("Desarme","def"),("Marcação sob pressão","def"),("Interceptação","def"),("Passe curto seguro","pass"),
 ("Lançamento longo","pass"),("Proteção da zaga","def"),("Cobertura","def"),("Chute de longe","shot"),
 ("Resistência","stamina"),("Liderança","lead"),("Leitura de jogo","def"),("Pressão na saída de bola","press"),
 ("Virada de jogo","pass"),("Condução","pass"),("Faro de rebote","shot"),("Cabeceio","head"),
 ("Carrinho preciso","def"),("Jogo físico","def"),("Organização","pass"),("Visão de jogo","pass"),
 ("Frieza","pass"),("Disciplina tática","card"),("Raça","lead"),("Antecipação","def"),
 ("Saída de jogo","pass"),("Recuperação de bola","press"),
]
MEI = [
 ("Passe decisivo","assist"),("Visão de jogo","pass"),("Drible","drib"),("Chute de longe","shot"),
 ("Cobrança de falta","fk"),("Finalização","shot"),("Armação","pass"),("Lançamento","assist"),
 ("Condução em velocidade","drib"),("Toque de primeira","pass"),("Assistência","assist"),("Último passe","assist"),
 ("Bola parada","fk"),("Inteligência tática","pass"),("Infiltração","shot"),("Movimentação","speed"),
 ("Pedalada","drib"),("Controle de bola","drib"),("Chute colocado","shot"),("Tabela","pass"),
 ("Criatividade","assist"),("Ritmo de jogo","pass"),("Resistência","stamina"),("Liderança técnica","lead"),
 ("Cavadinha","shot"),("Elástico","drib"),
]
ATA = [
 ("Finalização","shot"),("Cabeceio","head"),("Velocidade","speed"),("Drible","drib"),
 ("Oportunismo","shot"),("Faro de gol","shot"),("Chute forte","shot"),("Chute colocado","shot"),
 ("Pivô","hold"),("Domínio orientado","drib"),("Arrancada","speed"),("Movimentação sem bola","shot"),
 ("Frieza na cara do gol","shot"),("Voleio","shot"),("Bicicleta","shot"),("Cobrança de pênalti","penk"),
 ("Jogo aéreo","head"),("Proteção de bola","hold"),("Infiltração","speed"),("Tabelinha","pass"),
 ("Contra-ataque","speed"),("Chute de longe","shot"),("Raça","lead"),("Explosão","speed"),
 ("Gol de cavadinha","shot"),("Rebote","shot"),
]
CONDS = [
 ("pressao","sob pressão"),("fim","no fim do jogo"),("grande","em jogos grandes"),("fora","fora de casa"),
 ("casa","em casa"),("chuva","na chuva"),("calor","no calor"),("altitude","na altitude"),
 ("vencendo","quando vencendo"),("primeiro","no primeiro tempo"),
]
def lat(side):
    out=[]
    for name,eff in LAT:
        if name in ("Apoio ao ataque","Velocidade na ponta","Marcação de ponta"):
            name = f"{name} pela {side}"
        out.append((name,eff))
    return out
POS = [("G",G),("ZG",ZG),("LD",lat("direita")),("LE",lat("esquerda")),("VOL",VOL),("MEI",MEI),("ATA",ATA)]
rows=[]
for p,(pos,bases) in enumerate(POS):
    for i,(name,eff) in enumerate(bases):
        rows.append((pos,name,eff,"sempre"))
        for k in range(4):
            cid,ctext = CONDS[(i*3+k*2+p)%len(CONDS)]
            rows.append((pos,f"{name} {ctext}",eff,cid))
seen=set()
for r in rows:
    key=(r[0],r[1]); assert key not in seen, key; seen.add(key)
lines=["// Gerado por script: banco de habilidades por posição (base x condição).",
"// Cada habilidade tem um efeito no motor e uma condição em que ela se ativa.",
"// Não edite à mão: regenere com `python3 scripts/gen_habilidades.py`.","",
"import type { Pos } from '../types';","",
"export type EfeitoHabilidade =",
"  | 'gk' | 'gkout' | 'gkair' | 'pen' | 'penk' | 'build' | 'lead' | 'def' | 'head' | 'pass' | 'card'",
"  | 'stamina' | 'cross' | 'speed' | 'shot' | 'drib' | 'press' | 'assist' | 'fk' | 'hold';","",
"export type CondicaoHabilidade =",
"  | 'sempre' | 'pressao' | 'fim' | 'grande' | 'fora' | 'casa' | 'chuva' | 'calor' | 'altitude' | 'vencendo' | 'primeiro';","",
"export interface Habilidade {","  id: number;","  pos: Pos;","  nome: string;","  efeito: EfeitoHabilidade;","  cond: CondicaoHabilidade;","}","",
"type Row = [Pos, string, EfeitoHabilidade, CondicaoHabilidade];","",
"const ROWS: Row[] = ["]
for r in rows:
    nm=r[1].replace("'","\\'")
    lines.append(f"  ['{r[0]}', '{nm}', '{r[2]}', '{r[3]}'],")
lines += ["];","",
"export const HABILIDADES: Habilidade[] = ROWS.map(([pos, nome, efeito, cond], id) => ({ id, pos, nome, efeito, cond }));","",
"export const HABILIDADES_POR_POS: Record<Pos, Habilidade[]> = HABILIDADES.reduce((acc, h) => {",
"  (acc[h.pos] ??= []).push(h);","  return acc;","}, {} as Record<Pos, Habilidade[]>);",""]
open("src/engine/data/habilidades.ts","w").write("\n".join(lines))
print(len(rows), {p: sum(1 for r in rows if r[0]==p) for p,_ in POS})
