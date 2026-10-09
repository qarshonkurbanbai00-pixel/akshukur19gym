# -*- coding: utf-8 -*-
"""
АҚШҰҚЫР — ЦИФРЛЫҚ ШЕЖІРЕ
=======================
Ақшұқыр ауылының тарихын зерттеуге арналған интерактивті цифрлық жоба.
Flask backend: барлық деректер data/ папкасындағы JSON файлдардан оқылады.
Контентті өзгерту үшін Python кодты түрмей, тек JSON файлдарды өңдеу жеткілікті.
"""

import json
import os

from flask import Flask, jsonify, render_template, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

app = Flask(__name__)
# Қазақша әріптер JSON жауаптарда дұрыс көрсетілуі үшін
try:
    app.json.ensure_ascii = False          # Flask >= 2.2
except AttributeError:
    app.config["JSON_AS_ASCII"] = False    # Flask < 2.2

# ---------------------------------------------------------------------------
# Деректер дәлелдеме деңгейлері (бүкіл жобада ортақ)
# ---------------------------------------------------------------------------
EVIDENCE_LEVELS = {
    "written":        {"icon": "🟢", "label": "Жазба дерек",          "color": "#2ecc71"},
    "archive":        {"icon": "🔵", "label": "Архив дерегі",         "color": "#3b82f6"},
    "oral":           {"icon": "🟡", "label": "Ауызша дерек",         "color": "#eab308"},
    "research":       {"icon": "🟠", "label": "Зерттеу материалы",    "color": "#f97316"},
    "reconstruction": {"icon": "🟣", "label": "3D реконструкция",     "color": "#a855f7"},
    "needs_data":     {"icon": "⚪", "label": "Дерек қажет",          "color": "#94a3b8"},
}

_EVIDENCE_DESCS = {
    "written": "Жазба көздерде расталған мәлімет.",
    "archive": "Архив құжатына нақты сілтемесі бар дерек.",
    "oral": "Жергілікті адамдардың естелігі — кросс-тексеру қажет.",
    "research": "Ашық зерттеулер мен құжаттамалық материалдар.",
    "reconstruction": "Болжамды визуализация — тарихи факт емес.",
    "needs_data": "Әлі расталмаған — зерттеу барысында толықтырылады.",
}
for _k, _d in _EVIDENCE_DESCS.items():
    EVIDENCE_LEVELS[_k]["desc"] = _d

# ---------------------------------------------------------------------------
# «Тұлғалар» бөлімі: тексерілмеген өмірбаяндар енгізілмейді (Талап 8).
# Нақты жазба дерек табылған адамдар осы тізімге қосылады.
# ---------------------------------------------------------------------------
PERSONS = [
    {
        "id": "person-mashyryq",
        "name": "Машырық қажы",
        "role": "Рухани және білім дәуірімен байланыстырылатын тұлға",
        "summary": "Жергілікті ауызша деректер мен зерттеу материалдары Машырық қажы есімін Ақшұқыр өңіріндегі мешіт, медресе және білім беру дәуірімен байланыстырады.",
        "bio": "Тұлғаның өмір жылдары мен нақты іс-әрекеті туралы жазба дерек әзірге жинақталған жоқ. Ауызша деректер мен 1887 жылғы жазба дерек жанында тұрғызылып, зерттеу жүргізілуде. Расталмаған мәлімет факт ретінде көрсетілмейді.",
        "evidence": "oral",
        "image": None,
        "sources": [],
    },
    {
        "id": "person-qoshqar-ata",
        "name": "Қошқар ата",
        "role": "Қошқар ата қорымымен байланысты атақты есім",
        "summary": "Қорымға атын берген тұлға туралы нақты жазба деректер шектеулі — есім ауызша дәстүрде сақталған.",
        "bio": "Қошқар ата қорымы — жергілікті маңызы бар тарих және мәдениет ескерткіші (ресми мәдени мұра картасында тіркелген). Тұлғаның өмірбаяны ауызша тарих деңгейінде: нақты жылдар мен деректемелер зерттеу барысында толықтырылады.",
        "evidence": "oral",
        "image": None,
        "sources": ["src-inmap-qoshqar", "src-wiki-qoshqar"],
    },
    {
        "id": "person-placeholder",
        "name": "Басқа тұлғалар",
        "role": "Зерттеу барысында толықтырылады",
        "summary": "Ауыл тарихындағы тағы бір тұлға туралы жазба дерек табылғанда осы бөлімге қосылады.",
        "bio": "Алғашқы мұғалімдер, мектеп директорлары, ауылға белгілі адамдар — тек нақты дереккөзбен расталған тұлғалар ғана осы тізімге енгізіледі. Тексерілмеген өмірбаяндар факт ретінде жарияланбайды.",
        "evidence": "needs_data",
        "image": None,
        "sources": [],
    },
]

RESEARCH_METHODS = [
    ("🗂️", "Ақпаратты жинау", "Ашық дереккөздер, энциклопедиялық материалдар, интернет-ресурстар бойынша алғашқы мәліметтерді жинау."),
    ("🗄️", "Архивтік деректерді қарастыру", "Архив құжаттарын (сондай-ақ 1887 жылғы статистикалық деректі) тауып, деректемесін тіркеу."),
    ("📚", "Кітап/мақалаларды зерттеу", "Аймақ тарихына арналған басылымдар мен ғылыми мақалаларды талдау."),
    ("🖼️", "Фотоларды жинау", "Отбасылық архивтер мен мектеп мұрағатынан ескі фотоларды сканерлеу және каталогтау."),
    ("🎙️", "Тұрғындармен сұхбат", "Ауыл ақсақалдары мен ұзақ жылдық тұрғындардан естеліктер жазып алу."),
    ("🗺️", "Тарихи орындарды картаға түсіру", "Әр нүктенің координатасын анықтап, интерактивті картаға енгізу."),
    ("⚖️", "Ескі және қазіргі деректерді салыстыру", "Бір нысанның әр кезеңдегі деректерін жұптап, өзгерісті құжаттау."),
    ("✅", "Қорытынды жасау", "Тек кемінде бір нақты дерекпен расталған мәліметтерді ғана факт ретінде ұсыну."),
]

SITE_NAME = "АҚШҰҚЫР — ЦИФРЛЫҚ ШЕЖІРЕ"


def load_data(filename):
    """data/ папкасынан JSON файлды қауіпсіз оқу."""
    path = os.path.join(DATA_DIR, filename)
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as exc:
        app.logger.warning("Дерек файлы оқылмады (%s): %s", filename, exc)
        return []


@app.context_processor
def inject_globals():
    """Барлық шаблонда қолжетімді ортақ айнымалылар."""
    return {
        "site_name": SITE_NAME,
        "evidence_levels": EVIDENCE_LEVELS,
        "current_year": 2026,
    }


# ---------------------------------------------------------------------------
# Беттер
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    history = load_data("history.json")
    places = load_data("places.json")
    stats = [
        {"value": "1943", "label": "Алғашқы мектеп ашылған жыл", "evidence": "written"},
        {"value": "1887", "label": "Медресе туралы жазба дерек", "evidence": "archive"},
        {"value": str(len(places)), "label": "Картадағы тарихи нүкте", "evidence": "research"},
        {"value": "9+", "label": "Зерттелетін тарихи кезең", "evidence": "research"},
    ]
    return render_template("index.html", history=history, places=places, stats=stats)


@app.route("/tarikh")
def history():
    return render_template("history.html", history=load_data("history.json"),
                           sources=load_data("sources.json"))


@app.route("/tulghalar")
def persons():
    return render_template("persons.html", persons=PERSONS,
                           sources=load_data("sources.json"))


@app.route("/mashyryq")
def mashyryq():
    return render_template("mashyryq.html", sources=load_data("sources.json"))


@app.route("/karta")
def map_page():
    places = load_data("places.json")
    categories = sorted({p.get("category", "auyl") for p in places})
    return render_template("map.html", places=places, categories=categories)


@app.route("/rekonstrukciya")
def reconstruction():
    return render_template("reconstruction.html")


@app.route("/mektep")
def school():
    history = load_data("history.json")
    school_periods = [h for h in history if h.get("school_related")]
    return render_template("school.html", school_periods=school_periods)


@app.route("/muragat")
def archive():
    sources = load_data("sources.json")
    categories = sorted({s.get("type", "zertteu") for s in sources})
    return render_template("archive.html", sources=sources, categories=categories)


@app.route("/auyzsha-tarikh")
def oral_history():
    return render_template("oral-history.html", interviews=load_data("interviews.json"))


@app.route("/eksursiya")
def excursion():
    places = load_data("places.json")
    # Экскурсия маршруты — реті places.json ішіндегі excursion_order бойынша
    route = sorted([p for p in places if p.get("excursion_order")],
                   key=lambda p: p["excursion_order"])
    return render_template("excursion.html", route=route)


@app.route("/zertteu")
def research():
    return render_template("research.html", methods=RESEARCH_METHODS)


@app.route("/derek-kozder")
def sources_page():
    return render_template("sources.html", sources=load_data("sources.json"))


# ---------------------------------------------------------------------------
# JSON API (JS компоненттері пайдаланады: timeline, карта, іздеу)
# ---------------------------------------------------------------------------
@app.route("/api/history")
def api_history():
    return jsonify(load_data("history.json"))


@app.route("/api/places")
def api_places():
    return jsonify(load_data("places.json"))


@app.route("/api/sources")
def api_sources():
    return jsonify(load_data("sources.json"))


@app.route("/api/interviews")
def api_interviews():
    return jsonify(load_data("interviews.json"))


@app.route("/api/persons")
def api_persons():
    return jsonify(PERSONS)


@app.route("/api/search")
def api_search():
    """Барлық дерек жиынтығы бойынша қарапайым іздеу."""
    query = (request.args.get("q") or "").strip().lower()
    results = []
    if len(query) >= 2:
        datasets = [
            ("history.json", "/tarikh", "Тарих"),
            ("places.json", "/karta", "Тарихи орындар"),
            ("sources.json", "/muragat", "Цифрлық архив"),
            ("interviews.json", "/auyzsha-tarikh", "Ауызша тарих"),
        ]
        for filename, url, section in datasets:
            for item in load_data(filename):
                haystack = " ".join(str(v) for v in item.values()
                                    if isinstance(v, (str, int))).lower()
                if query in haystack:
                    results.append({
                        "section": section,
                        "title": item.get("title") or item.get("name") or "—",
                        "snippet": (item.get("summary") or item.get("description")
                                    or item.get("quote") or "")[:160],
                        "url": url,
                    })
        for person in PERSONS:
            haystack = (person["name"] + " " + person["summary"]).lower()
            if query in haystack:
                results.append({
                    "section": "Тұлғалар",
                    "title": person["name"],
                    "snippet": person["summary"][:160],
                    "url": "/tulghalar#" + person["id"],
                })
    return jsonify(results[:20])


@app.errorhandler(404)
def not_found(_):
    return render_template("404.html"), 404


if __name__ == "__main__":
    # pip install -r requirements.txt && python app.py
    app.run(host="127.0.0.1", port=5000, debug=True)
