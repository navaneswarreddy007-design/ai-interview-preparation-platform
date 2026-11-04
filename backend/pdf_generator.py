import io
import re
from datetime import datetime
from typing import Dict, Any, List

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# Page dimensions for A4
PAGE_WIDTH, PAGE_HEIGHT = A4

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas that computes total page count dynamically
    and draws professional running headers and footers with 'Page X of Y'.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        margin = 36  # 0.5 inch margins

        # Running Header (on pages 2 and later)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#475569"))
            self.drawString(margin, PAGE_HEIGHT - 25, "PREPFORGE")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(margin + 60, PAGE_HEIGHT - 25, "|  Candidate Performance & Evaluation Report")
            self.drawRightString(PAGE_WIDTH - margin, PAGE_HEIGHT - 25, "CONFIDENTIAL")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(margin, PAGE_HEIGHT - 29, PAGE_WIDTH - margin, PAGE_HEIGHT - 29)

        # Running Footer (all pages)
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(margin, 20, "PrepForge — AI-Powered Resume Interview Platform")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(PAGE_WIDTH - margin, 20, page_str)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(margin, 30, PAGE_WIDTH - margin, 30)

        self.restoreState()


def get_tier_label(score: float) -> str:
    if score >= 85:
        return "Top Candidate (Interview Ready)"
    elif score >= 70:
        return "Strong Competency (Minor Polish Recommended)"
    elif score >= 55:
        return "Developing Competency (Targeted Drills Recommended)"
    else:
        return "Foundational Focus Required"


def escape_xml(text: str) -> str:
    if not text:
        return ""
    text = str(text)
    # Replace XML special characters for ReportLab Paragraph
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Convert markdown-style bold **text** to <b>text</b>
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    return text


def generate_pdf_report(session_data: Dict[str, Any]) -> bytes:
    """
    Generates a high-quality multi-page vector PDF report using ReportLab.
    Returns the binary PDF bytes.
    """
    buffer = io.BytesIO()

    # Document setup: A4 with 36pt (0.5 inch) margins
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    usable_width = PAGE_WIDTH - 72

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#64748B')
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#64748B')
    )

    meta_value = ParagraphStyle(
        'MetaValue',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0F172A')
    )

    story = []

    # ---------------------------------------------------------
    # 1. HEADER SECTION
    # ---------------------------------------------------------
    header_data = [
        [
            Paragraph("<b>PREPFORGE</b>", ParagraphStyle('PfLogo', fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#2563EB'))),
            Paragraph("<b>CANDIDATE PERFORMANCE REPORT</b>", ParagraphStyle('RepType', fontName='Helvetica-Bold', fontSize=10, leading=14, alignment=2, textColor=colors.HexColor('#0F172A')))
        ],
        [
            Paragraph("AI-Powered Resume-Based Interview Preparation Platform", subtitle_style),
            Paragraph(f"Date: {datetime.now().strftime('%B %d, %Y')} • Confidential", ParagraphStyle('RepDate', fontName='Helvetica', fontSize=8, leading=11, alignment=2, textColor=colors.HexColor('#64748B')))
        ]
    ]

    header_table = Table(header_data, colWidths=[usable_width * 0.6, usable_width * 0.4])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#2563EB'), spaceAfter=10))

    # ---------------------------------------------------------
    # 2. CANDIDATE & SESSION METADATA CARD
    # ---------------------------------------------------------
    candidate_name = session_data.get("candidate_name", "Candidate")
    target_role = session_data.get("target_role", "Software Engineer")
    interview_type = session_data.get("interview_type", "Mixed")
    difficulty = session_data.get("difficulty", "Mid-Level")
    resume_file = session_data.get("resume_filename", "Uploaded Resume")
    eval_mode = session_data.get("evaluation_mode", "Demo Mode (Rule-Based Evaluation)")
    overall_score = float(session_data.get("overall_score", 0))

    meta_grid = [
        [
            Paragraph("CANDIDATE NAME", meta_label),
            Paragraph(escape_xml(candidate_name), meta_value),
            Paragraph("TARGET JOB ROLE", meta_label),
            Paragraph(escape_xml(target_role), meta_value),
        ],
        [
            Paragraph("INTERVIEW TYPE", meta_label),
            Paragraph(f"{escape_xml(interview_type)} ({escape_xml(difficulty)})", meta_value),
            Paragraph("RESUME SOURCE", meta_label),
            Paragraph(escape_xml(resume_file), meta_value),
        ],
        [
            Paragraph("EVALUATION ENGINE", meta_label),
            Paragraph(escape_xml(eval_mode), meta_value),
            Paragraph("SESSION ID", meta_label),
            Paragraph(escape_xml(session_data.get("id", "N/A")[:18] + "..."), meta_value),
        ]
    ]

    col_w = [usable_width * 0.18, usable_width * 0.32, usable_width * 0.18, usable_width * 0.32]
    meta_table = Table(meta_grid, colWidths=col_w)
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # 3. OVERALL SCORE & RUBRIC DIMENSIONS
    # ---------------------------------------------------------
    questions = session_data.get("questions", [])
    
    # Calculate rubric averages
    avg_rel, avg_acc, avg_cla, avg_evi = 0, 0, 0, 0
    valid_q_count = 0
    for q in questions:
        ev = q.get("evaluation") or {}
        if isinstance(ev, dict) and "score" in ev:
            avg_rel += float(ev.get("relevance_score", 0))
            avg_acc += float(ev.get("accuracy_score", 0))
            avg_cla += float(ev.get("clarity_score", 0))
            avg_evi += float(ev.get("evidence_score", 0))
            valid_q_count += 1

    if valid_q_count > 0:
        avg_rel = round(avg_rel / valid_q_count)
        avg_acc = round(avg_acc / valid_q_count)
        avg_cla = round(avg_cla / valid_q_count)
        avg_evi = round(avg_evi / valid_q_count)

    tier_label = get_tier_label(overall_score)
    score_color = '#059669' if overall_score >= 75 else ('#2563EB' if overall_score >= 60 else '#D97706')

    score_card_left = [
        Paragraph("OVERALL INTERVIEW BENCHMARK", ParagraphStyle('ScoreHdr', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#64748B'))),
        Spacer(1, 4),
        Paragraph(f"<b><font size=28 color='{score_color}'>{round(overall_score)}</font></b><font size=14 color='#94A3B8'>/100</font>", ParagraphStyle('ScoreNum', leading=32)),
        Spacer(1, 4),
        Paragraph(f"<b>{tier_label}</b>", ParagraphStyle('TierLbl', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#0F172A'))),
    ]

    score_card_right = [
        Paragraph("<b>CORE EVALUATION RUBRIC BREAKDOWN</b>", ParagraphStyle('RubricHdr', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#1E293B'))),
        Spacer(1, 5),
        Table([
            [Paragraph("<b>Relevance & Scope:</b>", body_style), Paragraph(f"<b>{avg_rel}</b>/100", ParagraphStyle('R1', parent=body_style, alignment=2))],
            [Paragraph("<b>Competency / Accuracy:</b>", body_style), Paragraph(f"<b>{avg_acc}</b>/100", ParagraphStyle('R2', parent=body_style, alignment=2))],
            [Paragraph("<b>Clarity & Structure:</b>", body_style), Paragraph(f"<b>{avg_cla}</b>/100", ParagraphStyle('R3', parent=body_style, alignment=2))],
            [Paragraph("<b>Evidence & STAR Rigor:</b>", body_style), Paragraph(f"<b>{avg_evi}</b>/100", ParagraphStyle('R4', parent=body_style, alignment=2))]
        ], colWidths=[usable_width * 0.42, usable_width * 0.16], style=[
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#F1F5F9'))
        ])
    ]

    score_summary_table = Table([
        [score_card_left, score_card_right]
    ], colWidths=[usable_width * 0.38, usable_width * 0.62])
    score_summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#FFFFFF')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0')),
        ('LINEAFTER', (0, 0), (0, 0), 1, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(score_summary_table)
    story.append(Spacer(1, 10))

    # ---------------------------------------------------------
    # 4. EXECUTIVE FINDINGS: STRENGTHS & GROWTH AREAS
    # ---------------------------------------------------------
    strengths = session_data.get("strengths", [])
    weaknesses = session_data.get("weaknesses", [])
    actionable_suggestions = session_data.get("actionable_suggestions", [])

    strengths_items = [Paragraph("<b>DEMONSTRATED STRENGTHS</b>", ParagraphStyle('StrHdr', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor('#065F46')))]
    if strengths:
        for s in strengths[:4]:
            strengths_items.append(Paragraph(f"• {escape_xml(s)}", body_style))
    else:
        strengths_items.append(Paragraph("• Standard baseline delivery addressed.", body_style))

    growth_items = [Paragraph("<b>IDENTIFIED GROWTH AREAS</b>", ParagraphStyle('GrwHdr', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor('#92400E')))]
    if weaknesses:
        for w in weaknesses[:4]:
            growth_items.append(Paragraph(f"• {escape_xml(w)}", body_style))
    else:
        growth_items.append(Paragraph("• Continue polishing edge cases and metrics.", body_style))

    exec_table = Table([
        [strengths_items, growth_items]
    ], colWidths=[usable_width * 0.5, usable_width * 0.5])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F0FDF4')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#FFFBEB')),
        ('BOX', (0, 0), (0, 0), 1, colors.HexColor('#BBF7D0')),
        ('BOX', (1, 0), (1, 0), 1, colors.HexColor('#FDE68A')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(exec_table)
    story.append(Spacer(1, 10))

    # Actionable Recommendations
    if actionable_suggestions:
        coach_recs = [Paragraph("<b>COACH'S ACTIONABLE RECOMMENDATIONS FOR NEXT ROUND</b>", ParagraphStyle('RecHdr', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.HexColor('#1E3A8A')))]
        for idx, rec in enumerate(actionable_suggestions[:3]):
            coach_recs.append(Paragraph(f"<b>{idx+1}.</b> {escape_xml(rec)}", body_style))
        recs_table = Table([[coach_recs]], colWidths=[usable_width])
        recs_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#BFDBFE')),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(recs_table)
        story.append(Spacer(1, 12))

    # ---------------------------------------------------------
    # 5. QUESTION-BY-QUESTION DETAILED EVALUATIONS
    # ---------------------------------------------------------
    story.append(Paragraph("QUESTION-BY-QUESTION EVALUATION BREAKDOWN", section_heading))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))

    for idx, q in enumerate(questions):
        q_elements = []
        ev = q.get("evaluation") or {}
        q_score = float(ev.get("score", 0))
        q_category = q.get("category", "General Evaluation")
        q_context = q.get("resume_context", "Verified Resume Anchor")
        q_text = q.get("question_text", f"Question {idx+1}")
        cand_answer = q.get("candidate_answer", "(No response submitted)")
        suggestion = ev.get("suggestion", "")
        improved = ev.get("improved_answer", "")

        # Question Title Bar with Score Badge
        q_hdr_table = Table([
            [
                Paragraph(f"<b>Question {idx+1}: {escape_xml(q_category)}</b>", ParagraphStyle('QHdr', fontName='Helvetica-Bold', fontSize=9.5, leading=13, textColor=colors.HexColor('#0F172A'))),
                Paragraph(f"<b>Score: {round(q_score)}/100</b>", ParagraphStyle('QSc', fontName='Helvetica-Bold', fontSize=9.5, leading=13, alignment=2, textColor=colors.HexColor('#2563EB')))
            ]
        ], colWidths=[usable_width * 0.75, usable_width * 0.25])
        q_hdr_table.setStyle(TableStyle([
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        q_elements.append(q_hdr_table)

        # Context badge
        q_elements.append(Paragraph(f"<i>Anchor: {escape_xml(q_context)}</i>", ParagraphStyle('QCtx', fontName='Helvetica-Oblique', fontSize=7.5, leading=10, textColor=colors.HexColor('#2563EB'))))
        q_elements.append(Spacer(1, 3))

        # Full Question
        q_elements.append(Paragraph(f"<b>Q:</b> {escape_xml(q_text)}", ParagraphStyle('QBody', fontName='Helvetica-Bold', fontSize=8.5, leading=12, textColor=colors.HexColor('#1E293B'))))
        q_elements.append(Spacer(1, 4))

        # Candidate Answer Box
        cand_ans_box = [
            Paragraph("<b>Candidate Submitted Answer:</b>", ParagraphStyle('AnsHdr', fontName='Helvetica-Bold', fontSize=7.5, leading=10, textColor=colors.HexColor('#64748B'))),
            Spacer(1, 2),
            Paragraph(escape_xml(cand_answer), body_style)
        ]
        ans_table = Table([[cand_ans_box]], colWidths=[usable_width - 8])
        ans_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        q_elements.append(ans_table)
        q_elements.append(Spacer(1, 4))

        # Rubric Subscores Row
        sub_rel = ev.get("relevance_score", 0)
        sub_acc = ev.get("accuracy_score", 0)
        sub_cla = ev.get("clarity_score", 0)
        sub_evi = ev.get("evidence_score", 0)

        subscore_row = [
            Paragraph(f"Relevance: <b>{sub_rel}</b>", meta_value),
            Paragraph(f"Accuracy: <b>{sub_acc}</b>", meta_value),
            Paragraph(f"Clarity: <b>{sub_cla}</b>", meta_value),
            Paragraph(f"STAR Evidence: <b>{sub_evi}</b>", meta_value),
        ]
        subscore_table = Table([subscore_row], colWidths=[(usable_width - 8) / 4] * 4)
        subscore_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        q_elements.append(subscore_table)
        q_elements.append(Spacer(1, 4))

        # Strengths & Weaknesses for this Question
        q_strengths = ev.get("strengths", [])
        q_weaknesses = ev.get("weaknesses", [])

        if q_strengths or q_weaknesses:
            str_text = "<b>Strengths:</b> " + (" ".join(q_strengths) if q_strengths else "Baseline response.")
            wk_text = "<b>Growth Areas:</b> " + (" ".join(q_weaknesses) if q_weaknesses else "None noted.")
            sw_table = Table([
                [
                    Paragraph(escape_xml(str_text), ParagraphStyle('SW1', parent=body_style, fontSize=8, leading=11, textColor=colors.HexColor('#065F46'))),
                    Paragraph(escape_xml(wk_text), ParagraphStyle('SW2', parent=body_style, fontSize=8, leading=11, textColor=colors.HexColor('#92400E')))
                ]
            ], colWidths=[(usable_width - 8) * 0.5, (usable_width - 8) * 0.5])
            sw_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            q_elements.append(sw_table)
            q_elements.append(Spacer(1, 4))

        # Coach Suggestion Callout
        if suggestion:
            sug_box = [
                Paragraph("<b>Coach's Specific Suggestion:</b>", ParagraphStyle('SugHdr', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#1E3A8A'))),
                Spacer(1, 2),
                Paragraph(escape_xml(suggestion), ParagraphStyle('SugTxt', parent=body_style, fontSize=8, leading=11, textColor=colors.HexColor('#1E3A8A')))
            ]
            sug_table = Table([[sug_box]], colWidths=[usable_width - 8])
            sug_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFDBFE')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            q_elements.append(sug_table)
            q_elements.append(Spacer(1, 4))

        # Improved Answer Showcase (STAR)
        if improved:
            imp_box = [
                Paragraph("<b>Model Improved Response (STAR Framed & Resume-Grounded):</b>", ParagraphStyle('ImpHdr', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0F172A'))),
                Spacer(1, 2),
                Paragraph(escape_xml(improved), ParagraphStyle('ImpTxt', parent=body_style, fontSize=7.5, leading=10.5, textColor=colors.HexColor('#334155')))
            ]
            imp_table = Table([[imp_box]], colWidths=[usable_width - 8])
            imp_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            q_elements.append(imp_table)

        # Wrap question block with separator
        story.append(KeepTogether(q_elements[:5]))  # Keep header, question, and answer together
        for el in q_elements[5:]:
            story.append(el)
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#E2E8F0'), spaceAfter=8))

    # ---------------------------------------------------------
    # 6. TARGETED PRACTICE RECOMMENDATIONS & DRILLS
    # ---------------------------------------------------------
    drills = session_data.get("drills", [])
    weak_topics = session_data.get("weak_topics", [])

    drill_elements = [
        Paragraph("RECOMMENDED TARGETED PRACTICE DRILLS", section_heading),
        Paragraph("Based on gaps identified in this interview session, the following follow-up drills are recommended:", subtitle_style),
        Spacer(1, 6)
    ]

    if weak_topics:
        topics_str = " • ".join([escape_xml(t) for t in weak_topics])
        drill_elements.append(Paragraph(f"<b>Identified Focus Topics:</b> {topics_str}", body_style))
        drill_elements.append(Spacer(1, 6))

    if drills:
        for idx, drill in enumerate(drills[:4]):
            d_topic = drill.get("topic", "Targeted Drill")
            d_q = drill.get("recommended_question", "")
            d_card = [
                Paragraph(f"<b>Drill {idx+1}: {escape_xml(d_topic)}</b>", ParagraphStyle('DrillHdr', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#2563EB'))),
                Spacer(1, 2),
                Paragraph(escape_xml(d_q), body_style)
            ]
            d_table = Table([[d_card]], colWidths=[usable_width])
            d_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            drill_elements.append(d_table)
            drill_elements.append(Spacer(1, 4))
    else:
        drill_elements.append(Paragraph("• No pending drills. Candidate performed strongly across all evaluated competencies.", body_style))

    story.append(KeepTogether(drill_elements))

    # Build PDF document
    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer.getvalue()
