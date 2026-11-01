"""Assemble lon/lat source GeoJSON for the map from:
- SIANE (IGN, via rOpenSpain/mapSpain) 1:3M rivers, 1:10M autonomous communities and provincial capitals
- Natural Earth 10m countries and rivers (for the Portuguese stretches of the Duero and Tajo)
Run once; the output in data-src/ is committed so builds don't need the raw data."""
import sys, json, struct, sqlite3, collections
RAW = sys.argv[1]  # folder containing the cloned raw data
sys.path.insert(0, sys.argv[2])  # folder with shp.py
from shp import read_dbf, read_shp
OUT = 'data-src'

# The 14 rivers: id, display name, SIANE id_rio, Natural Earth name for any Portuguese continuation
RIVERS = [
    ('ebro', 'Ebro', '2004', None),
    ('guadiana', 'Guadiana', '1008', ('Guadiana',)),
    ('guadalquivir', 'Guadalquivir', '10094', None),
    ('mino', 'Miño', '10038', None),
    ('jucar', 'Júcar', '2002', None),
    ('segura', 'Segura', '20016', None),
    ('turia', 'Turia', '20034', None),
    ('llobregat', 'Llobregat', '20052', None),
    ('tajo', 'Tajo', '1006', ('Tejo', 'Tajo')),
    ('duero', 'Duero', '1004', ('Duero', 'Douro')),
    ('nervion', 'Nervión', '100372', None),
    ('nalon', 'Nalón', None, 'Río Nalón'),
    ('navia', 'Navia', None, 'Río Navia'),
    ('bidasoa', 'Bidasoa', '1003712', None),
]

sdir = f'{RAW}/siane/data-raw/2020/SIANE_CARTO_BASE_S_3M/todo/se89_3_hidro_rio_l_x'
recs = read_dbf(sdir + '.dbf'); geo = read_shp(sdir + '.shp')
by_id = collections.defaultdict(list); by_name = collections.defaultdict(set)
for r, g in zip(recs, geo):
    by_id[r['id_rio']].extend(g)
    if r['rotulo']: by_name[r['rotulo']].add(r['id_rio'])

ne = json.load(open(f'{RAW}/ne/geojson/ne_10m_rivers_lake_centerlines.geojson'))
def ne_lines(names):
    out = []
    for f in ne['features']:
        if f['properties'].get('name') in names and f['geometry']:
            g = f['geometry']
            out += g['coordinates'] if g['type'] == 'MultiLineString' else [g['coordinates']]
    return out

features = []
for rid, name, sid, extra in RIVERS:
    if sid is None:  # look up by label
        ids = by_name[extra]; assert len(ids) == 1, (name, ids); sid = ids.pop(); extra = None
    lines = [list(map(list, l)) for l in by_id[sid]]
    if extra:
        west = min(p[0] for l in lines for p in l)
        if rid == 'guadiana':  # SIANE omits the stretch inside Portugal (Badajoz to Pomarão)
            keep = lambda p: p[0] < -6.95 and 37.45 < p[1] < 38.92
        else:  # Portuguese lower course, west of where the Spanish data stops
            keep = lambda p: p[0] < west + 0.02
        for l in ne_lines(extra):
            seg = [p for p in l if keep(p)]
            if len(seg) > 1: lines.append(seg)
    lines = [[[round(x, 4), round(y, 4)] for x, y in l] for l in lines]
    features.append({'type': 'Feature', 'properties': {'id': rid, 'name': name},
                     'geometry': {'type': 'MultiLineString', 'coordinates': lines}})
    print(f'{name:14} {sum(len(l) for l in lines):5} pts  lon {min(p[0] for l in lines for p in l):.2f}..{max(p[0] for l in lines for p in l):.2f}')
json.dump({'type': 'FeatureCollection', 'features': features}, open(f'{OUT}/rivers.geojson', 'w'), ensure_ascii=False)

# --- GeoPackage helpers ---
def parse_gpkg_geom(b):
    flags = b[3]; env = [0, 32, 48, 48, 64][(flags >> 1) & 7]
    return parse_wkb(memoryview(b)[8 + env:])[0]
def parse_wkb(b, o=0):
    le = b[o] == 1; e = '<' if le else '>'; t = struct.unpack_from(e + 'I', b, o + 1)[0] % 1000; o += 5
    def pts(o):
        n = struct.unpack_from(e + 'I', b, o)[0]; o += 4
        v = struct.unpack_from(e + '%dd' % (2 * n), b, o); return [[round(v[i], 4), round(v[i + 1], 4)] for i in range(0, 2 * n, 2)], o + 16 * n
    if t == 1:
        x, y = struct.unpack_from(e + '2d', b, o); return {'type': 'Point', 'coordinates': [x, y]}, o + 16
    if t == 3:
        n = struct.unpack_from(e + 'I', b, o)[0]; o += 4; rings = []
        for _ in range(n): r, o = pts(o); rings.append(r)
        return {'type': 'Polygon', 'coordinates': rings}, o
    if t == 4:  # MultiPoint: keep the first point
        n = struct.unpack_from(e + 'I', b, o)[0]; o += 4; first = None
        for _ in range(n):
            g, o = parse_wkb(b, o); first = first or g
        return first, o
    if t == 6:
        n = struct.unpack_from(e + 'I', b, o)[0]; o += 4; polys = []
        for _ in range(n): g, o = parse_wkb(b, o); polys.append(g['coordinates'])
        return {'type': 'MultiPolygon', 'coordinates': polys}, o
    raise ValueError(t)
def gpkg_features(path, props):
    c = sqlite3.connect(path); t = c.execute('select table_name from gpkg_contents').fetchone()[0]
    for row in c.execute(f"select geom, {', '.join(props)} from '{t}'"):
        yield parse_gpkg_geom(row[0]), dict(zip(props, row[1:]))

ccaa = [{'type': 'Feature', 'properties': {'name': p['rotulo']}, 'geometry': g}
        for g, p in gpkg_features(f'{RAW}/siane/dist/se89_10_admin_ccaa_a_x.gpkg', ['rotulo'])]
json.dump({'type': 'FeatureCollection', 'features': ccaa}, open(f'{OUT}/regions.geojson', 'w'), ensure_ascii=False)

CITIES = {'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Bilbao', 'Oviedo', 'Valladolid',
          'Murcia', 'A Coruña', 'Badajoz', 'Toledo', 'Lleida', 'Córdoba'}
cities = []
for g, p in gpkg_features(f'{RAW}/siane/dist/se89_10_urban_capiprov_p_x.gpkg', ['rotulo']):
    n = p['rotulo'].split('/')[0]
    if n in CITIES: cities.append({'type': 'Feature', 'properties': {'name': n}, 'geometry': g})
print('cities', sorted(f['properties']['name'] for f in cities))
json.dump({'type': 'FeatureCollection', 'features': cities}, open(f'{OUT}/cities.geojson', 'w'), ensure_ascii=False)

# Countries: Spain + neighbours, only polygons near the peninsula
countries = json.load(open(f'{RAW}/ne/geojson/ne_10m_admin_0_countries.geojson'))
keep = {'ESP': 'spain', 'PRT': 'portugal', 'FRA': 'france', 'AND': 'andorra', 'MAR': 'morocco', 'GIB': 'other', 'DZA': 'algeria'}
land = []
def near(poly):
    xs = [p[0] for p in poly[0]]; ys = [p[1] for p in poly[0]]
    return max(xs) > -11 and min(xs) < 6 and max(ys) > 34.5 and min(ys) < 45
for f in countries['features']:
    a3 = f['properties'].get('ADM0_A3')
    if a3 not in keep: continue
    g = f['geometry']; polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    polys = [p for p in polys if near(p)]
    if polys:
        land.append({'type': 'Feature', 'properties': {'name': f['properties']['NAME'], 'kind': keep[a3]},
                     'geometry': {'type': 'MultiPolygon', 'coordinates': polys}})
print('land', [f['properties']['name'] for f in land])
json.dump({'type': 'FeatureCollection', 'features': land}, open(f'{OUT}/land.geojson', 'w'))
