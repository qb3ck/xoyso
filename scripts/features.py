"""Hand-drawn physical-map features (relief, peaks, gulfs, capes, seas, islands, Canary inset).
exec'd from build_map.py, so it shares proj/rdp/fmt/out/W/H/S. Coordinates are (lon, lat).
Relief shapes are simplified teaching versions drawn from atlas knowledge, not survey data."""
import random

PXDEG = math.hypot(*[a - b for a, b in zip(proj(-3, 41), proj(-3, 40))])  # px per degree of latitude
def P(lonlat): return proj(*lonlat)
def box_of(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))]
def ring_d(pts): return fmt(pts) + 'Z'
def orient(pts):  # force positive (clockwise on screen) orientation so overlapping pieces union under nonzero fill
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    return pts if a >= 0 else pts[::-1]

def ridge(line, seed):
    """line: [(lon, lat, halfwidth_deg)...] -> list of rings (projected) approximating a mountain belt."""
    rnd = random.Random(seed); rings = []; centre = [(P(p[:2]), p[2] * PXDEG) for p in line]
    # resample every ~7px with jittered width
    pts = []
    for (a, wa), (b, wb) in zip(centre, centre[1:]):
        n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 7))
        for i in range(n):
            t = i / n; pts.append(((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), (wa + (wb - wa) * t) * (0.72 + 0.56 * rnd.random())))
    pts.append(centre[-1])
    for i in range(len(pts) - 1):
        (a, wa), (b, wb) = pts[i], pts[i + 1]
        dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1; nx, ny = -dy / L, dx / L
        rings.append(orient([(a[0] + nx * wa, a[1] + ny * wa), (b[0] + nx * wb, b[1] + ny * wb), (b[0] - nx * wb, b[1] - ny * wb), (a[0] - nx * wa, a[1] - ny * wa)]))
    for (c, w) in pts:
        rings.append(orient([(c[0] + w * math.cos(k * math.pi / 5), c[1] + w * math.sin(k * math.pi / 5)) for k in range(10)]))
    return rings, [c for c, _ in centre]

items = out['items']
def add_area(key, rings, anchor=None, inset=False, kind='area'):
    allpts = [p for r in rings for p in r]
    d = ''.join(ring_d(r) for r in rings)
    bx = box_of(allpts)
    it = {'kind': kind, 'd': d, 'box': bx, 'a': [round(anchor[0], 1), round(anchor[1], 1)] if anchor else [(bx[0] + bx[2]) // 2, (bx[1] + bx[3]) // 2]}
    if inset: it['inset'] = 1
    items[key] = it
def poly(ll, eps=0.3): return rdp(orient([P(p) for p in ll]), eps)
def add_poly(key, ll, **kw): add_area(key, [poly(ll)], **kw)
def add_point(key, lon, lat, inset_xy=None):
    x, y = inset_xy or P((lon, lat))
    items[key] = {'kind': 'point', 'd': f'M{x:.1f},{y:.1f}L{x + 0.01:.1f},{y:.1f}', 'box': [round(x) - 3, round(y) - 3, round(x) + 3, round(y) + 3], 'a': [round(x, 1), round(y, 1)]}

# ---------------------------------------------------------------- relief
RANGES = {
 'pirineos': [[(-1.9, 43.05, .22), (-0.9, 42.85, .3), (0.3, 42.7, .3), (1.3, 42.6, .26), (2.2, 42.4, .2), (3.05, 42.35, .1)]],
 'sistema_central': [[(-6.4, 40.3, .15), (-5.5, 40.3, .2), (-4.7, 40.4, .2), (-4.1, 40.75, .17), (-3.6, 41.1, .13)]],
 'sistema_iberico': [[(-3.2, 42.2, .2), (-2.6, 42.0, .22), (-2.2, 41.6, .22), (-1.9, 41.1, .24), (-1.6, 40.6, .26), (-1.4, 40.2, .24), (-0.9, 40.1, .22), (-0.3, 40.4, .18)]],
 'sierra_morena': [[(-6.9, 38.0, .18), (-5.9, 38.1, .2), (-4.9, 38.3, .2), (-4.0, 38.4, .18), (-3.2, 38.4, .15)]],
 'cordillera_cantabrica': [[(-7.1, 42.75, .22), (-6.2, 43.0, .26), (-5.2, 43.0, .24), (-4.4, 43.05, .2), (-3.7, 43.0, .14)]],
 'montes_de_toledo': [[(-5.4, 39.5, .13), (-4.7, 39.5, .15), (-4.0, 39.4, .13), (-3.5, 39.4, .1)]],
 'sistema_costero_catalan': [[(0.8, 41.1, .12), (1.5, 41.4, .15), (2.1, 41.65, .15), (2.8, 41.78, .13), (3.1, 41.9, .1)]],
 'sierra_de_tramuntana': [[(2.35, 39.6, .05), (2.7, 39.76, .07), (3.0, 39.84, .06), (3.35, 39.95, .05)]],
 'sistema_betico': [[(-5.3, 36.7, .22), (-4.7, 36.9, .28), (-3.7, 37.0, .3), (-3.0, 37.1, .3), (-2.3, 37.4, .25), (-1.8, 37.8, .15)],
                    [(-4.6, 37.5, .2), (-3.4, 37.9, .25), (-2.4, 38.2, .25), (-1.3, 38.3, .2)]],
 'montes_vascos': [[(-3.4, 43.12, .1), (-2.7, 43.0, .12), (-2.1, 42.95, .12)]],
 'macizo_galaico': [[(-8.1, 42.9, .3), (-7.7, 42.35, .38), (-7.3, 41.95, .3)]],
}
MESETA = [(-6.7, 42.0), (-5.0, 42.5), (-4.0, 42.4), (-3.2, 42.2), (-2.3, 41.3), (-1.6, 40.5), (-1.5, 39.9), (-1.5, 39.0), (-2.5, 38.6),
          (-4.0, 38.4), (-5.5, 38.3), (-6.8, 38.6), (-7.2, 39.5), (-6.9, 40.5), (-6.7, 41.2)]
DEPR_EBRO = [(-2.5, 42.5), (-1.5, 42.7), (-0.6, 42.2), (0.6, 42.0), (1.0, 41.6), (0.5, 41.1), (-0.3, 41.1), (-1.2, 41.4), (-2.0, 41.9), (-2.6, 42.2)]
DEPR_GUAD = [(-6.9, 37.4), (-6.3, 37.9), (-5.3, 37.8), (-4.4, 37.5), (-3.6, 37.8), (-3.4, 37.5), (-4.3, 37.1), (-5.3, 36.9), (-6.1, 36.8), (-6.5, 37.0)]

range_rings = []
for i, (rid, lines) in enumerate(RANGES.items()):
    rings = []; mid = None
    for j, line in enumerate(lines):
        r, c = ridge(line, i * 10 + j); rings += r
        if j == 0: mid = c[len(c) // 2]
    add_area('relief:' + rid, rings, anchor=mid); range_rings += rings
add_poly('relief:meseta_central', MESETA)
add_poly('relief:depresion_del_ebro', DEPR_EBRO)
add_poly('relief:depresion_del_guadalquivir', DEPR_GUAD)
out['bg'] = {  # always-visible shading layers, drawn under the quiz items
    'meseta': ring_d(poly(MESETA)),
    'depr': ring_d(poly(DEPR_EBRO)) + ring_d(poly(DEPR_GUAD)),
    'ranges': ''.join(ring_d(r) for r in range_rings),
}

# ---------------------------------------------------------------- peaks and capes (dots)
for pid, (lon, lat) in {'aneto': (0.656, 42.631), 'mulhacen': (-3.311, 37.053)}.items(): add_point('peaks:' + pid, lon, lat)
CAPES = {'fisterra': (-9.266, 42.907), 'creus': (3.316, 42.320), 'estaca_de_bares': (-7.688, 43.789), 'san_vicente': (-8.997, 37.023),
         'trafalgar': (-6.032, 36.183), 'gata': (-2.191, 36.720), 'la_nao': (0.231, 38.737), 'palos': (-0.693, 37.634)}
for cid, (lon, lat) in CAPES.items(): add_point('capes:' + cid, lon, lat)

# ---------------------------------------------------------------- seas, gulfs, strait, delta, lagoon (water polygons)
GULFS = {
 'valencia': [(0.1, 39.85), (0.7, 39.85), (0.6, 39.0), (0.05, 38.9), (-0.2, 39.2), (-0.2, 39.5)],
 'vizcaya': [(-3.9, 44.85), (-1.4, 44.85), (-1.4, 44.0), (-3.9, 44.0)],
 'cadiz': [(-7.2, 36.7), (-6.45, 36.4), (-6.45, 35.95), (-7.2, 35.95)],
 'almeria': [(-3.0, 36.62), (-2.3, 36.62), (-2.3, 36.2), (-3.0, 36.2)],
 'leon': [(3.7, 43.1), (5.4, 43.1), (5.4, 42.0), (3.7, 42.0)],
}
for gid, ll in GULFS.items(): add_poly('gulfs:' + gid, ll)
SEAS = {  # small shapes first so they win overlaps
 'estrecho_de_gibraltar': [(-5.75, 36.12), (-5.35, 36.12), (-5.35, 35.88), (-5.75, 35.88)],
 'delta_del_ebro': [(0.6, 40.78), (0.75, 40.8), (0.95, 40.75), (0.9, 40.65), (0.75, 40.6), (0.65, 40.68)],
 'mar_menor': [(-0.85, 37.78), (-0.76, 37.82), (-0.72, 37.7), (-0.76, 37.63), (-0.84, 37.66), (-0.87, 37.72)],
 'mar_cantabrico': [(-7.5, 44.4), (-1.6, 44.4), (-1.8, 43.9), (-4.0, 43.75), (-7.5, 43.75)],
 'oceano_atlantico': [(-10.7, 44.4), (-8.0, 44.4), (-8.6, 43.7), (-9.8, 43.2), (-10.0, 42.0), (-9.9, 39.0), (-9.8, 37.3), (-8.9, 36.4),
                      (-7.0, 36.1), (-6.5, 36.0), (-6.5, 35.2), (-10.7, 35.2)],
 'mar_mediterraneo': [(-2.0, 36.3), (-0.5, 37.2), (1.2, 38.3), (3.0, 38.4), (5.5, 38.0), (5.5, 35.1), (-2.0, 35.1)],
}
for sid, ll in SEAS.items(): add_poly('seas:' + sid, ll, kind='area')

# ---------------------------------------------------------------- islands
isl = load('islands')
for f in isl['features']:
    iid = f['properties']['id']
    if iid in ('tenerife', 'gran_canaria', 'lanzarote', 'fuerteventura', 'la_palma', 'la_gomera', 'el_hierro'): continue
    rings = [rdp([P(p) for p in f['geometry']['coordinates'][0]], 0.2)]
    add_area('islands:' + iid, [orient(r) for r in rings])

# Canary Islands inset (equirectangular, own scale), bottom-left box
IX, IW, IH = 10, 202, 100
IY = H - IH - 12
LON0, LAT0, K = -18.3, 29.5, 43.0
def iproj(lon, lat): return IX + 8 + (lon - LON0) * math.cos(math.radians(28.4)) * K, IY + 8 + (LAT0 - lat) * K
inset_land = []
for f in isl['features']:
    iid = f['properties']['id']
    if iid not in ('tenerife', 'gran_canaria', 'lanzarote', 'fuerteventura', 'la_palma', 'la_gomera', 'el_hierro'): continue
    ring = orient(rdp([iproj(*p) for p in f['geometry']['coordinates'][0]], 0.15))
    add_area('islands:' + iid, [ring], inset=True)
    inset_land.append(ring_d(ring))
add_point('peaks:teide', 0, 0, inset_xy=iproj(-16.642, 28.272)); items['peaks:teide']['inset'] = 1
out['inset'] = {'x': IX, 'y': IY, 'w': IW, 'h': IH, 'land': ''.join(inset_land), 'label': 'Islas Canarias'}

# ---------------------------------------------------------------- clue data for the "Conexiones" questions
PLACES = {  # id: (name, lon, lat)
 'toledo': ('Toledo', -4.02, 39.86), 'zaragoza': ('Zaragoza', -0.88, 41.65), 'cordoba': ('Córdoba', -4.78, 37.89), 'sevilla': ('Sevilla', -5.98, 37.39),
 'valencia': ('Valencia', -0.38, 39.47), 'murcia': ('Murcia', -1.13, 37.98), 'bilbao': ('Bilbao', -2.93, 43.26), 'oviedo': ('Oviedo', -5.85, 43.36),
 'merida': ('Mérida', -6.34, 38.92), 'badajoz': ('Badajoz', -6.97, 38.88), 'barcelona': ('Barcelona', 2.17, 41.39), 'soria': ('Soria', -2.47, 41.76),
 'zamora': ('Zamora', -5.75, 41.50), 'oporto': ('Oporto', -8.61, 41.15), 'cuenca': ('Cuenca', -2.13, 40.07), 'lugo': ('Lugo', -7.56, 43.01),
 'ourense': ('Ourense', -7.86, 42.34), 'lisboa': ('Lisboa', -9.14, 38.72), 'tarragona': ('Tarragona', 1.25, 41.12), 'irun': ('Irún', -1.79, 43.34),
 'madrid': ('Madrid', -3.70, 40.42), 'avila': ('Ávila', -4.70, 40.66), 'segovia': ('Segovia', -4.12, 40.95), 'granada': ('Granada', -3.60, 37.18),
 'teruel': ('Teruel', -1.11, 40.34), 'palma': ('Palma', 2.65, 39.57), 'huelva': ('Huelva', -6.95, 37.26), 'cadiz': ('Cádiz', -6.29, 36.53),
 'almeria': ('Almería', -2.46, 36.84), 'cartagena': ('Cartagena', -0.99, 37.60), 'alicante': ('Alicante', -0.48, 38.35), 'girona': ('Girona', 2.82, 41.98),
 'pamplona': ('Pamplona', -1.64, 42.82), 'a_coruna': ('A Coruña', -8.41, 43.37), 'santander': ('Santander', -3.80, 43.46), 'leon': ('León', -5.57, 42.60),
 'ciudad_real': ('Ciudad Real', -3.93, 38.99), 'sc_tenerife': ('Santa Cruz de Tenerife', -16.25, 28.47), 'palma_canarias': ('Santa Cruz de La Palma', -17.76, 28.68),
}
out['places'] = {}
for pid, (nm, lon, lat) in PLACES.items():
    x, y = iproj(lon, lat) if lon < -12 else P((lon, lat))
    out['places'][pid] = {'name': nm, 'x': round(x, 1), 'y': round(y, 1)}
REGION_IDS = {'Andalucía': 'andalucia', 'Aragón': 'aragon', 'Principado de Asturias': 'asturias', 'Illes Balears': 'baleares', 'Cantabria': 'cantabria',
              'Comunidad de Madrid': 'madrid', 'Castilla y León': 'castilla_leon', 'Región de Murcia': 'murcia', 'Castilla-La Mancha': 'castilla_la_mancha',
              'Cataluña/Catalunya': 'cataluna', 'Extremadura': 'extremadura', 'Galicia': 'galicia', 'Comunidad Foral de Navarra': 'navarra',
              'País Vasco/Euskadi': 'pais_vasco', 'La Rioja': 'la_rioja', 'Comunitat Valenciana': 'valenciana'}
out['areas'] = {REGION_IDS[f['properties']['name']]: poly_path(f['geometry'], 0.5) for f in regions['features'] if f['properties']['name'] in REGION_IDS}
for f in land['features']:
    if f['properties']['kind'] == 'france': out['areas']['francia'] = poly_path(f['geometry'], 0.6)
    if f['properties']['kind'] == 'portugal': out['areas']['portugal'] = poly_path(f['geometry'], 0.6)

# ---------------------------------------------------------------- comunidades autónomas as quiz items
RID = dict(REGION_IDS); RID.update({'Ciudad de Ceuta': 'ceuta', 'Ciudad de Melilla': 'melilla'})
for f in regions['features']:
    rid = RID[f['properties']['name']]; g = f['geometry']
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    rings = []
    for poly in polys:
        pts = [P(p) for p in poly[0]]
        if not any(inside(p) for p in pts): continue
        pts = clip_ring(pts); small = rid in ('ceuta', 'melilla', 'baleares')
        r = rdp(pts, 0.04 if small else 0.5)
        if len(r) >= 3: rings.append(orient(r))
    big = max(rings, key=lambda r: (max(p[0] for p in r) - min(p[0] for p in r)) * (max(p[1] for p in r) - min(p[1] for p in r)))
    bb = box_of(big)
    add_area('regions:' + rid, rings, anchor=((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2))
# Canarias = the seven islands in the inset
cn = [items['islands:' + i] for i in ('tenerife', 'gran_canaria', 'lanzarote', 'fuerteventura', 'la_palma', 'la_gomera', 'el_hierro')]
items['regions:canarias'] = {'kind': 'area', 'd': ''.join(c['d'] for c in cn), 'box': [IX, IY, IX + IW, IY + IH], 'a': [IX + IW / 2, IY + IH / 2 - 4], 'inset': 1}
out['places'].update({k: {'name': nm, 'x': round(P((lo, la))[0], 1), 'y': round(P((lo, la))[1], 1)} for k, (nm, lo, la) in {
    'valladolid': ('Valladolid', -4.72, 41.65), 'santiago': ('Santiago de Compostela', -8.54, 42.88), 'vitoria': ('Vitoria-Gasteiz', -2.67, 42.85),
    'logrono': ('Logroño', -2.45, 42.47)}.items()})
out['places']['las_palmas'] = {'name': 'Las Palmas de Gran Canaria', 'x': round(iproj(-15.41, 28.12)[0], 1), 'y': round(iproj(-15.41, 28.12)[1], 1)}
