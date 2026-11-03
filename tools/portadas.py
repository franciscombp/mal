# Genera las portadas de los juegos (img/portadas/*.svg) que usa la portada de una.red.
# Uso: python3 tools/portadas.py
import math, os, random
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'img', 'portadas')
W,H=1600,1000
def svg(fondo, cuerpo, defs=''):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs>
<filter id="grano" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .09 0"/></filter>
{defs}
</defs>
<rect width="{W}" height="{H}" fill="{fondo}"/>
{cuerpo}
<rect width="{W}" height="{H}" filter="url(#grano)"/>
</svg>
'''
def guardar(n,s): open(f'{OUT}/{n}.svg','w').write(s)
R=random.Random(7)

# ── Coches de madera: la bajada del Panecillo, de noche, con cohetes
c=[]
c.append('<rect y="0" width="1600" height="1000" fill="url(#cielo)"/>')
for i in range(70):
    x,y=R.uniform(0,1600),R.uniform(0,520); c.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{R.choice([1.5,2,2.5])}" fill="#F4E9D8" opacity="{R.uniform(.25,.7):.2f}"/>')
for cx,cy,col in [(1180,190,'#F2B33D'),(1390,300,'#E5533D'),(980,120,'#F4E9D8')]:
    for k in range(16):
        a=k*math.pi/8; r1,r2=18,R.uniform(70,95)
        c.append(f'<line x1="{cx+r1*math.cos(a):.0f}" y1="{cy+r1*math.sin(a):.0f}" x2="{cx+r2*math.cos(a):.0f}" y2="{cy+r2*math.sin(a):.0f}" stroke="{col}" stroke-width="5" stroke-linecap="round" opacity=".9"/>')
c.append('<path d="M0 640 C 300 560 520 520 760 470 C 980 425 1180 470 1600 560 L1600 1000 L0 1000Z" fill="#1E2B52"/>')
c.append('<path d="M0 760 C 380 650 760 600 1600 700 L1600 1000 L0 1000Z" fill="#26386A"/>')
c.append('<path d="M-40 1000 L 1640 690 L1640 820 L 220 1000Z" fill="#3A2A28"/>')  # la calle en bajada
c.append('<path d="M120 1000 L 1640 735" stroke="#F4E9D8" stroke-width="6" stroke-dasharray="46 40" opacity=".5"/>')
# el coche de madera
c.append('<g transform="translate(760 736) rotate(-10.5) scale(1.45)">'
 '<rect x="-230" y="-40" width="460" height="46" rx="8" fill="#C98A4B"/>'
 '<rect x="-230" y="-40" width="460" height="14" rx="6" fill="#E0A866"/>'
 '<line x1="-200" y1="-18" x2="200" y2="-18" stroke="#9C6634" stroke-width="3"/>'
 '<rect x="150" y="-110" width="16" height="74" fill="#9C6634"/><rect x="120" y="-120" width="80" height="14" rx="7" fill="#9C6634"/>'
 '<circle cx="-160" cy="30" r="46" fill="#1A1414"/><circle cx="-160" cy="30" r="18" fill="#C98A4B"/>'
 '<circle cx="170" cy="30" r="46" fill="#1A1414"/><circle cx="170" cy="30" r="18" fill="#C98A4B"/></g>')
for i,y in enumerate([690,720,750]):
    c.append(f'<line x1="{260-i*40}" y1="{y+130}" x2="{420-i*40}" y2="{y+100}" stroke="#F2B33D" stroke-width="6" stroke-linecap="round" opacity="{.8-i*.2:.1f}"/>')
guardar('coches',svg('#141C3A',''.join(c),'<linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#101833"/><stop offset="1" stop-color="#2A3C78"/></linearGradient>'))

# ── El boliche: la tina vista desde arriba, con sus dos agujeros
c=[]
for r,o in [(560,.06),(470,.08),(380,.10)]: c.append(f'<circle cx="800" cy="500" r="{r}" fill="none" stroke="#C9A45C" stroke-width="2" opacity="{o}"/>')
c.append('<circle cx="800" cy="500" r="300" fill="#2A2230"/><circle cx="800" cy="500" r="300" fill="none" stroke="#C9A45C" stroke-width="14"/>')
c.append('<circle cx="800" cy="500" r="262" fill="none" stroke="#C9A45C" stroke-width="2" opacity=".5"/>')
c.append('<circle cx="720" cy="500" r="34" fill="#0F0B12"/><circle cx="880" cy="500" r="34" fill="#0F0B12"/>')
c.append('<line x1="800" y1="230" x2="800" y2="770" stroke="#C9A45C" stroke-width="2" opacity=".35" stroke-dasharray="8 10"/>')
for x,y,col in [(690,360,'#E9E2D3'),(905,390,'#5FB3C9'),(640,610,'#E9E2D3'),(960,640,'#E5533D'),(820,690,'#5FB3C9'),(770,330,'#E5533D'),(1010,500,'#E9E2D3'),(585,470,'#5FB3C9')]:
    c.append(f'<circle cx="{x}" cy="{y}" r="22" fill="{col}"/><circle cx="{x-7}" cy="{y-7}" r="6" fill="#fff" opacity=".55"/>')
c.append('<g fill="#C9A45C" opacity=".9"><circle cx="230" cy="860" r="40"/><circle cx="230" cy="860" r="28" fill="#1A141E"/><circle cx="1370" cy="150" r="40"/><circle cx="1370" cy="150" r="28" fill="#1A141E"/></g>')
guardar('boliche',svg('#1A141E',''.join(c)))

# ── Guagua de pan: la guagua junto a la taza de colada morada
c=[]
c.append('<circle cx="800" cy="520" r="420" fill="#B9672F" opacity=".45"/>')
c.append('<ellipse cx="760" cy="850" rx="430" ry="46" fill="#5A2C12" opacity=".5"/>')
c.append('<g><rect x="560" y="300" width="300" height="540" rx="150" fill="#E2A15C"/>'
 '<rect x="560" y="300" width="300" height="540" rx="150" fill="none" stroke="#C47F3E" stroke-width="10"/>'
 '<circle cx="710" cy="330" r="128" fill="#E8AE6C"/><circle cx="710" cy="330" r="128" fill="none" stroke="#C47F3E" stroke-width="10"/>'
 '<path d="M580 520 Q710 470 840 520" stroke="#7E2F6E" stroke-width="26" fill="none" stroke-linecap="round"/>'
 '<path d="M580 600 Q710 560 840 600" stroke="#F4E9D8" stroke-width="18" fill="none" stroke-linecap="round"/>'
 '<path d="M590 680 L630 650 L670 680 L710 650 L750 680 L790 650 L830 680" stroke="#E5533D" stroke-width="14" fill="none" stroke-linejoin="round" stroke-linecap="round"/>'
 '<rect x="650" y="740" width="120" height="22" rx="11" fill="#F4E9D8"/></g>')
c.append('<g><rect x="980" y="560" width="250" height="260" rx="34" fill="#F4E9D8"/><path d="M1230 620 q90 10 70 100 q-20 70 -70 70" fill="none" stroke="#F4E9D8" stroke-width="26"/>'
 '<ellipse cx="1105" cy="565" rx="125" ry="30" fill="#5B1E57"/><ellipse cx="1105" cy="565" rx="95" ry="18" fill="#7E2F6E"/>'
 '<path d="M1060 500 q-20 -40 10 -80 M1120 500 q-20 -40 10 -80" stroke="#F4E9D8" stroke-width="8" fill="none" stroke-linecap="round" opacity=".55"/></g>')
guardar('guagua',svg('#8E4A1D',''.join(c)))

# ── La fanesca: el plato, los doce granos en anillos
c=[]
c.append('<circle cx="800" cy="500" r="380" fill="#E9DFC9"/><circle cx="800" cy="500" r="300" fill="#D9A93A"/>')
c.append('<circle cx="800" cy="500" r="380" fill="none" stroke="#C7BBA0" stroke-width="10"/>')
gr=['#F2D16B','#6E8B3D','#A8C686','#7A4A2A','#E8E0CF','#C0582F','#F2D16B','#3F5E2A','#E5533D','#F4E9D8','#9C6B3C','#B6CF7A']
for k in range(12):
    a=k*2*math.pi/12-math.pi/2
    for j,rr in enumerate([90,165,235]):
        x,y=800+rr*math.cos(a+j*.26),500+rr*math.sin(a+j*.26)
        c.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{20-j*2}" ry="{14-j}" transform="rotate({math.degrees(a)+90:.0f} {x:.0f} {y:.0f})" fill="{gr[k]}"/>')
c.append('<circle cx="800" cy="500" r="40" fill="#F4E9D8"/><circle cx="800" cy="500" r="18" fill="#E5533D" opacity=".8"/>')
c.append('<path d="M1210 180 L1420 240 L1410 270 L1200 210Z" fill="#C7BBA0"/><circle cx="1215" cy="195" r="20" fill="#C7BBA0"/>')
guardar('fanesca',svg('#1F3A3A',''.join(c)))

# ── Estado Decepción: la carrera, en bandas, con la valla y la portada
c=[]
for i in range(9): c.append(f'<polygon points="{-400+i*260},1000 {-120+i*260},1000 {420+i*260},0 {140+i*260},0" fill="#E9E2D3" opacity="{.03+.02*(i%3)}"/>')
c.append('<rect x="0" y="770" width="1600" height="230" fill="#15171C"/><rect x="0" y="770" width="1600" height="8" fill="#D6382B"/>')
c.append('<g transform="translate(1080 560)"><rect x="-180" y="0" width="360" height="40" fill="#D6382B"/><rect x="-180" y="80" width="360" height="40" fill="#D6382B"/>'
 '<g fill="#F4E9D8"><rect x="-150" y="0" width="40" height="40"/><rect x="-50" y="0" width="40" height="40"/><rect x="50" y="0" width="40" height="40"/><rect x="-100" y="80" width="40" height="40"/><rect x="0" y="80" width="40" height="40"/><rect x="100" y="80" width="40" height="40"/></g>'
 '<rect x="-160" y="40" width="20" height="170" fill="#8C8F96"/><rect x="140" y="40" width="20" height="170" fill="#8C8F96"/></g>')
# corredor geométrico
c.append('<g transform="translate(470 470) skewX(-12)" fill="#F4E9D8"><circle cx="40" cy="-150" r="52"/>'
 '<path d="M0 -90 L90 -90 L120 90 L40 90Z"/><path d="M90 -70 L220 0 L200 36 L80 -20Z"/><path d="M10 -70 L-120 -10 L-100 26 L20 -10Z"/>'
 '<path d="M50 80 L140 190 L110 300 L70 290 L90 200 L20 120Z"/><path d="M60 80 L-30 180 L-150 210 L-160 170 L-60 140 L10 80Z"/></g>')
c.append('<g transform="translate(250 330) rotate(-14)"><rect width="190" height="240" fill="#E9E2D3"/><rect x="18" y="20" width="150" height="26" fill="#15171C"/><g fill="#8C8F96"><rect x="18" y="64" width="150" height="10"/><rect x="18" y="86" width="120" height="10"/><rect x="18" y="108" width="150" height="10"/><rect x="18" y="130" width="90" height="10"/></g><rect x="18" y="160" width="150" height="60" fill="#D6382B"/></g>')
guardar('estadodecepcion',svg('#0B0D12',''.join(c)))

# ── El Lamparómetro: la lámpara sobre el espectro político
c=[]
cols=['#2A5FA8','#4C86C6','#8FB5D9','#E9E2D3','#E8A598','#D9604E','#B8321F']
for i,col in enumerate(cols): c.append(f'<rect x="{160+i*183}" y="800" width="183" height="56" fill="{col}"/>')
c.append('<polygon points="800,792 780,760 820,760" fill="#15171C"/>')
c.append('<line x1="800" y1="0" x2="800" y2="250" stroke="#15171C" stroke-width="6"/>')
c.append('<path d="M640 470 L700 250 L900 250 L960 470Z" fill="#D6382B"/><rect x="690" y="236" width="220" height="28" rx="6" fill="#15171C"/>')
c.append('<polygon points="660,470 940,470 1180,760 420,760" fill="#F7D774" opacity=".35"/><ellipse cx="800" cy="478" rx="60" ry="24" fill="#FFF3C4"/>')
guardar('lamparometro',svg('#F1EBDF',''.join(c)))

# ── Modo Incógnito: la planta en isométrico, el escritorio vacío
def iso(x,y,z=0): return 800+(x-y)*80, 400+(x+y)*46-z*92
c=[]
for i in range(-6,7):
    x1,y1=iso(i,-6); x2,y2=iso(i,6); c.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="#2E6F78" stroke-width="2" opacity=".35"/>')
    x1,y1=iso(-6,i); x2,y2=iso(6,i); c.append(f'<line x1="{x1:.0f}" y1="{y1:.0f}" x2="{x2:.0f}" y2="{y2:.0f}" stroke="#2E6F78" stroke-width="2" opacity=".35"/>')
def caja(x,y,w,d,h,top,izq,der):
    p=lambda *a:' '.join(f'{u:.0f},{v:.0f}' for u,v in a)
    return (f'<polygon points="{p(iso(x,y,h),iso(x+w,y,h),iso(x+w,y+d,h),iso(x,y+d,h))}" fill="{top}"/>'
            f'<polygon points="{p(iso(x,y+d,h),iso(x+w,y+d,h),iso(x+w,y+d,0),iso(x,y+d,0))}" fill="{izq}"/>'
            f'<polygon points="{p(iso(x+w,y,h),iso(x+w,y+d,h),iso(x+w,y+d,0),iso(x+w,y,0))}" fill="{der}"/>')
for (x,y) in [(-2,-1),(1,-1),(-2,2)]:
    c.append(caja(x,y,2.2,1.2,1,'#E9E2D3','#B9B2A3','#CFC8B8'))
    c.append(caja(x+.6,y+.2,1,.12,1.8,'#15232E','#0F1A25','#1C2D3A'))
c.append(caja(2.4,1.6,1.4,1.4,1.6,'#2E6F78','#1E4C52','#265C63'))
cx,cy=iso(1.9,-.5,1.0); c.append(f'<ellipse cx="{cx:.0f}" cy="{cy:.0f}" rx="16" ry="9" fill="#F2B33D"/><rect x="{cx-16:.0f}" y="{cy:.0f}" width="32" height="26" fill="#F2B33D"/><path d="M{cx-4:.0f} {cy-14:.0f} q-10 -18 4 -34" stroke="#E9E2D3" stroke-width="4" fill="none" opacity=".6"/>')
gx,gy=iso(1.6,2.6,0); c.append(f'<ellipse cx="{gx:.0f}" cy="{gy:.0f}" rx="44" ry="18" fill="#000" opacity=".3"/><rect x="{gx-30:.0f}" y="{gy-150:.0f}" width="60" height="150" rx="26" fill="#D6382B"/><circle cx="{gx:.0f}" cy="{gy-178:.0f}" r="30" fill="#D6382B"/>')
guardar('modo-incognito',svg('#0F1A25',''.join(c)))

# ── Pambamesa: tres ollas de las tres regiones, con su vapor
c=[]
c.append('<rect x="0" y="690" width="1600" height="310" fill="#123F80"/><rect x="0" y="690" width="1600" height="10" fill="#F2B33D" opacity=".8"/>')
for x,col,an in [(430,'#E5533D',260),(800,'#F2B33D',300),(1170,'#2FA37A',240)]:
    c.append(f'<ellipse cx="{x}" cy="690" rx="{an/2+24}" ry="22" fill="#0B2C5C" opacity=".6"/>')
    c.append(f'<path d="M{x-an/2} 470 L{x+an/2} 470 L{x+an/2-24} 680 L{x-an/2+24} 680Z" fill="{col}"/>')
    c.append(f'<rect x="{x-an/2-20}" y="452" width="{an+40}" height="30" rx="15" fill="{col}"/><rect x="{x-an/2-20}" y="452" width="{an+40}" height="10" rx="5" fill="#fff" opacity=".25"/>')
    c.append(f'<rect x="{x-an/2-56}" y="510" width="44" height="18" rx="9" fill="{col}"/><rect x="{x+an/2+12}" y="510" width="44" height="18" rx="9" fill="{col}"/>')
    for k in (-1,0,1): c.append(f'<path d="M{x+k*50} 420 q-24 -50 0 -100 q24 -50 0 -100" stroke="#F4E9D8" stroke-width="9" fill="none" stroke-linecap="round" opacity=".45"/>')
guardar('pambamesa',svg('#1B5FAA',''.join(c)))

# ── Huecas: el cuaderno de la abuela, el plato que recupera el color
c=[]
c.append('<g transform="rotate(-4 800 500)"><rect x="250" y="150" width="1100" height="700" fill="#F4EEE2"/><rect x="250" y="150" width="550" height="700" fill="#ECE4D4"/><line x1="800" y1="150" x2="800" y2="850" stroke="#CFC5B1" stroke-width="4"/>')
for y in range(230,850,46): c.append(f'<line x1="290" y1="{y}" x2="1310" y2="{y}" stroke="#B8C9D9" stroke-width="2"/>')
c.append('<line x1="340" y1="150" x2="340" y2="850" stroke="#E5A598" stroke-width="3"/>')
c.append('<g fill="none" stroke="#3B3B3B" stroke-width="5" stroke-linecap="round"><path d="M380 300 h300 M380 346 h240 M380 392 h280 M380 438 h200 M380 530 h300 M380 576 h260"/></g>')
c.append('<circle cx="1075" cy="520" r="190" fill="none" stroke="#3B3B3B" stroke-width="5" stroke-dasharray="14 10"/>')
c.append('<clipPath id="mitad"><rect x="1075" y="300" width="230" height="450"/></clipPath>')
c.append('<g clip-path="url(#mitad)"><circle cx="1075" cy="520" r="190" fill="#F7F3EA"/><circle cx="1075" cy="520" r="150" fill="#E5533D"/><circle cx="1130" cy="470" r="40" fill="#F2B33D"/><circle cx="1110" cy="590" r="30" fill="#2FA37A"/><circle cx="1180" cy="560" r="22" fill="#F4E9D8"/></g>')
c.append('<g fill="none" stroke="#3B3B3B" stroke-width="4"><circle cx="1075" cy="520" r="150"/><circle cx="1020" cy="470" r="40"/><circle cx="1030" cy="590" r="30"/></g></g>')
guardar('huecas',svg('#D98575',''.join(c)))

# ── Cuentan que…: el atrio de San Francisco, con la piedra que falta
c=[]
c.append('<clipPath id="arco"><path d="M520 860 L520 440 A280 280 0 0 1 1080 440 L1080 860Z"/></clipPath><path d="M520 860 L520 440 A280 280 0 0 1 1080 440 L1080 860Z" fill="#2C2433"/><g clip-path="url(#arco)">')
filas=[(860,780),(780,700),(700,620),(620,540),(540,460)]
for fi,(y2,y1) in enumerate(filas):
    off=0 if fi%2==0 else 70
    for k in range(-1,9):
        x=380+off+k*140+30
        if x<380 or x>1080: continue
        falta=(fi==2 and k==3)
        if falta: c.append(f'<rect x="{x+6}" y="{y1+6}" width="128" height="{y2-y1-12}" fill="none" stroke="#E7B54A" stroke-width="5" stroke-dasharray="14 10"/>')
        else: c.append(f'<rect x="{x+6}" y="{y1+6}" width="128" height="{y2-y1-12}" rx="6" fill="#5A4C63"/>')
c.append('</g><path d="M520 860 L520 440 A280 280 0 0 1 1080 440 L1080 860" fill="none" stroke="#E7B54A" stroke-width="4" opacity=".5"/>')
c.append('<g transform="translate(1250 300) rotate(12)"><rect x="-64" y="-34" width="128" height="68" rx="6" fill="#E7B54A"/><circle cx="64" cy="0" r="16" fill="#E7B54A"/><circle cx="0" cy="34" r="16" fill="#1D1822"/></g>')
c.append('<circle cx="1330" cy="140" r="54" fill="#E7B54A" opacity=".9"/>')
for x,y in [(200,180),(320,90),(1450,520),(150,520),(1500,300)]: c.append(f'<circle cx="{x}" cy="{y}" r="3" fill="#F4E9D8" opacity=".6"/>')
guardar('leyendas',svg('#1D1822',''.join(c)))

# ── Umbral: la escalera imposible por el Qhapaq Ñan
def iso2(x,y,z): return 960+(x-y)*84, 470+(x+y)*48-z*96
c=[]
def bloque(x,y,z):
    p=lambda *a:' '.join(f'{u:.0f},{v:.0f}' for u,v in a)
    return (f'<polygon points="{p(iso2(x,y,z+1),iso2(x+1,y,z+1),iso2(x+1,y+1,z+1),iso2(x,y+1,z+1))}" fill="#F3D7C2"/>'
            f'<polygon points="{p(iso2(x,y+1,z+1),iso2(x+1,y+1,z+1),iso2(x+1,y+1,z),iso2(x,y+1,z))}" fill="#C98A7A"/>'
            f'<polygon points="{p(iso2(x+1,y,z+1),iso2(x+1,y+1,z+1),iso2(x+1,y+1,z),iso2(x+1,y,z))}" fill="#E2AE97"/>')
camino=[(-3,1,0),(-2,1,0),(-1,1,0),(0,1,0),(0,0,1),(0,-1,2),(1,-1,2),(2,-1,2),(2,0,1),(2,1,0),(1,1,0)]
for b in sorted(camino,key=lambda t:(t[0]+t[1],t[2])): c.append(bloque(*b))
fx,fy=iso2(-2.5,1.5,1); c.append(f'<rect x="{fx-9:.0f}" y="{fy-60:.0f}" width="18" height="44" rx="6" fill="#D6382B"/><circle cx="{fx:.0f}" cy="{fy-70:.0f}" r="11" fill="#D6382B"/>')
c.append('<circle cx="1280" cy="200" r="70" fill="#F3D7C2" opacity=".85"/>')
guardar('umbral',svg('#3B3561',''.join(c)))

# ── Nero: el gato en la ventana, de noche
c=[]
c.append('<rect x="520" y="160" width="560" height="620" fill="#1F2E4A"/><circle cx="930" cy="300" r="58" fill="#F1E3C2"/>')
for x,y in [(620,260),(700,420),(1010,500),(600,560)]: c.append(f'<circle cx="{x}" cy="{y}" r="3" fill="#F1E3C2" opacity=".7"/>')
c.append('<rect x="790" y="160" width="20" height="620" fill="#C9AE8C"/><rect x="520" y="460" width="560" height="20" fill="#C9AE8C"/>')
c.append('<rect x="500" y="140" width="600" height="660" fill="none" stroke="#C9AE8C" stroke-width="40"/><rect x="440" y="790" width="720" height="40" fill="#B69A78"/>')
c.append('<g fill="#141414"><ellipse cx="760" cy="720" rx="120" ry="80"/><circle cx="700" cy="600" r="62"/><polygon points="650,560 660,490 700,548"/><polygon points="750,560 742,490 704,548"/>'
 '<path d="M860 760 q90 -10 80 -120 q-6 -50 30 -60" stroke="#141414" stroke-width="22" fill="none" stroke-linecap="round"/></g>')
c.append('<g fill="#F2B33D"><ellipse cx="680" cy="598" rx="9" ry="5"/><ellipse cx="722" cy="598" rx="9" ry="5"/></g>')
guardar('nero',svg('#E9D7BC',''.join(c)))

# ── No es tan fácil: cincuenta personas y tres caminos
c=[]
for k,(x2,y2,col) in enumerate([(1300,200,'#C7F24A'),(1380,500,'#E9E2D3'),(1300,800,'#E5533D')]):
    c.append(f'<path d="M760 500 C 1000 500 1060 {y2} {x2} {y2}" stroke="{col}" stroke-width="10" fill="none" opacity=".85"/>')
    c.append(f'<circle cx="{x2}" cy="{y2}" r="40" fill="{col}"/>')
R2=random.Random(3)
for i in range(50):
    a=R2.uniform(0,2*math.pi); r=math.sqrt(R2.uniform(0,1))*230
    x,y=520+r*math.cos(a),500+r*math.sin(a)
    c.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="16" fill="{R2.choice(["#E9E2D3","#E9E2D3","#C7F24A","#8C8F96"])}"/>')
c.append('<circle cx="760" cy="500" r="26" fill="#0D1117" stroke="#E9E2D3" stroke-width="6"/>')
guardar('tanfacil',svg('#0D1117',''.join(c)))
print(sorted(os.listdir(OUT)))
