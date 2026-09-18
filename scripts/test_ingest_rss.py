"""Pruebas de las reglas de ingest_rss.py:  python -m unittest scripts/test_ingest_rss.py"""

import sys
import unittest
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from ingest_rss import classify, clean_name, eligibility, find_deadline  # noqa: E402

TODAY = date(2026, 9, 18)


def item(title: str, text: str, categories=(), html: str = "") -> dict:
    return {
        "guid": title, "feed": "Prueba", "link": "https://feed.example/x", "title": title,
        "publishedAt": None, "categories": list(categories), "html": html, "text": text,
    }


class Eligibility(unittest.TestCase):
    def check(self, text, open_rd, rule=None):
        got = eligibility(text)
        self.assertEqual(got[0], open_rd, text)
        if rule:
            self.assertEqual(got[1], rule, text)

    def test_global(self):
        self.check("Open to applicants from all countries.", "si", "global")

    def test_faq_question_is_not_a_claim(self):
        self.check("Is the fellowship open worldwide? Only UK residents.", "no-claro")

    def test_eu_only(self):
        self.check("Applicants must be nationals of an EU Member State.", "no")

    def test_restriction_beats_generic_phrase(self):
        self.check("International applicants welcome. Mid-career professionals from across Europe.", "no")

    def test_us_and_international(self):
        self.check("Open to U.S. citizens and international students.", "si", "global")

    def test_us_only_with_negation(self):
        self.check("Only U.S. citizens may apply. International students are not eligible.", "no", "solo-eeuu")

    def test_us_residents(self):
        self.check("Open to U.S. citizens or permanent residents.", "no", "eeuu-residente")

    def test_latam(self):
        self.check("Candidates from Latin America and the Caribbean are encouraged.", "si", "latam")

    def test_latam_among_continents_is_global(self):
        self.check("Open to someone applying from Asia, Africa, Europe, Latin America or elsewhere.", "si", "global")

    def test_dominican_listed(self):
        self.check("Eligible countries include Mexico, Dominican Republic and Peru.", "si")

    def test_developing_needs_review(self):
        self.check("For researchers from low- and middle-income countries.", "no-claro", "paises-elegibles")

    def test_silent(self):
        self.check("A great program for young leaders.", "no-claro", "ver-notas")


class Deadlines(unittest.TestCase):
    def check(self, text, kind, when=None):
        got = find_deadline(text)
        self.assertEqual(got[0], kind, text)
        self.assertEqual(got[1], when, text)

    def test_formats(self):
        self.check("Deadline: 25 September 2026", "exacta", date(2026, 9, 25))
        self.check("Deadline: 07-Jul-2027 The OPEC Award", "exacta", date(2027, 7, 7))
        self.check("The deadline to submit is October 31, 2026, at 11:59 p.m.", "exacta", date(2026, 10, 31))
        self.check("Deadline The next cycle is scheduled for: September 14–18, 2026", "exacta", date(2026, 9, 18))

    def test_rolling_and_missing(self):
        self.check("Deadline: Applications are reviewed on a rolling basis", "continua")
        self.check("A program with no dates at all.", "por-confirmar")


class Decisions(unittest.TestCase):
    def state(self, it, auto=True):
        return classify(it, TODAY, auto, "2026-09-18T12:00:00+00:00")

    def test_clear_scholarship_is_approved(self):
        c = self.state(item("Global Master's Scholarship 2027", "Fully funded for master's students. Open to all nationalities. Deadline: 30 November 2026."))
        self.assertEqual(c["estado"], "aprobada")
        self.assertEqual(c["oportunidad"]["funding"], "completa")
        self.assertEqual(c["oportunidad"]["deadline"], {"kind": "exacta", "date": "2026-11-30"})

    def test_review_flag_never_approves(self):
        c = self.state(item("Global Master's Scholarship 2027", "For master's students. Open to all nationalities. Deadline: 30 November 2026."), auto=False)
        self.assertEqual(c["estado"], "pendiente")

    def test_unclear_eligibility_waits(self):
        c = self.state(item("Youth Fellowship 2027", "For students and recent graduates. Deadline: 30 November 2026."))
        self.assertEqual(c["estado"], "pendiente")

    def test_closed(self):
        c = self.state(item("Student Fellowship 2026", "For students. Open to all nationalities. Deadline: 1 September 2026."))
        self.assertEqual(c["estado"], "descartada")

    def test_job(self):
        c = self.state(item("Policy Analyst Job at NRGI: Earn $34,000 Per Year", "Full-time position.", ["Jobs"]))
        self.assertEqual(c["estado"], "descartada")

    def test_internship_is_not_a_job(self):
        c = self.state(item("UN Internship 2027 in Geneva", "Internship for graduate students of all nationalities. Deadline: 1 December 2026."))
        self.assertEqual(c["estado"], "aprobada")
        self.assertEqual(c["oportunidad"]["destinations"], ["Suiza"])

    def test_org_grants_and_digests(self):
        self.assertEqual(self.state(item("Rapid Response Grant for Grassroots Organizations", "Funding for NGOs."))["estado"], "descartada")
        self.assertEqual(self.state(item("30+ Fresh Global Grants for Young People", "A list."))["estado"], "descartada")

    def test_senior_researchers(self):
        c = self.state(item("Research Fellowships 2027", "Funding for experienced researchers at UK universities. Deadline: 1 December 2026."))
        self.assertEqual(c["estado"], "descartada")

    def test_postdoc_level(self):
        c = self.state(item("Medical Fellowships 2026 at Oxford", "Supports early-career researchers transitioning to independent research careers. Open to all nationalities. Deadline: 1 December 2026."))
        self.assertEqual(c["estado"], "descartada")

    def test_apply_link_skips_feed_and_tracking(self):
        html = '<a href="https://feed.example/post">Apply for X</a> <a href="https://org.example/apply?utm_source=chatgpt.com&id=3">APPLY HERE</a>'
        c = self.state(item("Global Scholarship 2027", "For students of all nationalities. Deadline: 1 December 2026.", html=html))
        self.assertEqual(c["oportunidad"]["applyUrl"], "https://org.example/apply?id=3")


class Sponsors(unittest.TestCase):
    def test_program_at(self):
        from ingest_rss import detect_sponsor
        self.assertEqual(detect_sponsor("Applications are now open for the 2027 Fellowship Program at The Open Notebook (TON), a paid role."), "The Open Notebook")
        self.assertEqual(detect_sponsor("The European Bank for Reconstruction and Development (EBRD) is inviting applications."), "European Bank for Reconstruction and Development (EBRD)")


class Names(unittest.TestCase):
    def test_clean_name(self):
        self.assertEqual(clean_name("EBRD Internship 2026 in Brussels: Apply for a 6-Month Intern Position"), "EBRD Internship 2026 in Brussels")
        self.assertEqual(clean_name("CFAs: Novo Nordisk Foundation Award for Teachers"), "Novo Nordisk Foundation Award for Teachers")


if __name__ == "__main__":
    unittest.main()
