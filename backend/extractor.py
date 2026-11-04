import re
import os
from pathlib import Path
from typing import Dict, Any, List
import pypdf
import docx

ALLOWED_EXTENSIONS = {'pdf', 'docx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

COMMON_SKILLS_CATALOG = {
    "languages": [
        "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust",
        "ruby", "php", "swift", "kotlin", "sql", "html", "css", "sass", "bash", "shell", "r"
    ],
    "frameworks": [
        "react", "react.js", "react js", "next.js", "nextjs", "vue", "vue.js", "angular",
        "node.js", "nodejs", "express", "express.js", "flask", "django", "fastapi", "spring boot",
        "asp.net", "laravel", "rails", "ruby on rails", "tailwind css", "bootstrap", "graphql"
    ],
    "databases": [
        "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch", "sqlite",
        "dynamodb", "cassandra", "neo4j", "oracle", "mariadb", "firebase", "supabase"
    ],
    "devops_cloud": [
        "aws", "amazon web services", "azure", "gcp", "google cloud", "docker", "kubernetes",
        "terraform", "ansible", "jenkins", "github actions", "gitlab ci", "ci/cd", "linux",
        "nginx", "apache", "helm", "prometheus", "grafana"
    ],
    "tools_concepts": [
        "git", "github", "gitlab", "jira", "postman", "rest api", "microservices", "agile",
        "scrum", "unit testing", "jest", "pytest", "cypress", "system design", "data structures",
        "algorithms", "ci/cd", "websocket", "jwt", "oauth", "kafka", "rabbitmq"
    ]
}

def validate_file(filename: str, file_size: int = 0) -> Dict[str, Any]:
    if not filename or '.' not in filename:
        return {"valid": False, "error": "Invalid filename or missing extension."}
    
    ext = filename.rsplit('.', 1)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "valid": False,
            "error": f"Unsupported file format '.{ext}'. Please upload a PDF or DOCX file."
        }
    
    if file_size > MAX_FILE_SIZE:
        return {
            "valid": False,
            "error": f"File size exceeds 10MB limit. Current size: {round(file_size / (1024 * 1024), 2)}MB"
        }
    
    return {"valid": True, "extension": ext}

def extract_text_from_pdf(file_path: str) -> str:
    text_content = []
    try:
        reader = pypdf.PdfReader(file_path)
        for page_idx, page in enumerate(reader.pages):
            page_text = page.extract_text()
            if page_text:
                text_content.append(page_text)
        return "\n".join(text_content).strip()
    except Exception as e:
        raise ValueError(f"Failed to read PDF file: {str(e)}")

def extract_text_from_docx(file_path: str) -> str:
    try:
        doc = docx.Document(file_path)
        text_content = [p.text for p in doc.paragraphs if p.text.strip()]
        # also check tables
        for table in doc.tables:
            for row in table.rows:
                row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if row_text:
                    text_content.append(" | ".join(row_text))
        return "\n".join(text_content).strip()
    except Exception as e:
        raise ValueError(f"Failed to read DOCX file: {str(e)}")

def clean_and_normalize_text(text: str) -> str:
    # Replace weird unicode spaces and characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', text)
    text = re.sub(r'\r\n|\r', '\n', text)
    # Deduplicate excessive newlines while preserving paragraphs
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def parse_resume_structure(raw_text: str) -> Dict[str, Any]:
    text = clean_and_normalize_text(raw_text)
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    # 1. Contact / Header Info
    email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
    email = email_match.group(0) if email_match else ""
    
    phone_match = re.search(r'(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?', text)
    phone = phone_match.group(0).strip() if phone_match else ""
    
    github_match = re.search(r'(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)', text, re.IGNORECASE)
    github = github_match.group(0) if github_match else ""
    
    linkedin_match = re.search(r'(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)', text, re.IGNORECASE)
    linkedin = linkedin_match.group(0) if linkedin_match else ""
    
    # Guess candidate name from first 3 non-empty lines
    candidate_name = "Candidate"
    for line in lines[:4]:
        # If line has no email, phone, or url and is short (2-4 words)
        clean_line = re.sub(r'[^a-zA-Z\s]', '', line).strip()
        words = clean_line.split()
        if 2 <= len(words) <= 4 and not any(kw in clean_line.lower() for kw in ['resume', 'curriculum', 'vitae', 'page', 'phone', 'email', 'developer', 'engineer']):
            candidate_name = clean_line
            break
        elif len(words) == 2 or len(words) == 3:
            candidate_name = clean_line
            break

    # 2. Section Partitioning
    sections = {
        "summary": "",
        "skills": "",
        "internships": "",
        "experience": "",
        "projects": "",
        "education": "",
        "certifications": ""
    }
    
    section_headers = [
        (r'(?i)^(?:professional\s+)?summary|profile|about\s+me|objective', 'summary'),
        (r'(?i)^(?:technical\s+)?skills|technologies|core\s+competencies|tools\s*(?:&|and)\s*technologies', 'skills'),
        (r'(?i)^(?:internships?|internship\s+experience|industrial\s+training|training\s*(?:&|and)\s*internship)', 'internships'),
        (r'(?i)^(?:work\s+experience|professional\s+experience|employment(?:\s+history)?|work\s+history|experience\b)', 'experience'),
        (r'(?i)^(?:academic\s*(?:&|and)\s*personal\s*projects?|academic\s*projects?|personal\s*projects?|college\s*projects?|coursework\s*projects?|key\s*projects?|projects?\b)', 'projects'),
        (r'(?i)^(?:education|academic\s+background|academics|qualifications)', 'education'),
        (r'(?i)^(?:certifications?|certificates?|licenses?|achievements|awards)', 'certifications')
    ]
    
    current_section = "summary"
    for line in lines:
        matched = False
        for pattern, sec_name in section_headers:
            if re.match(pattern, line):
                current_section = sec_name
                matched = True
                break
        if not matched and current_section:
            sections[current_section] += line + "\n"

    # 3. Categorize Extracted Skills
    matched_skills = {
        "languages": [],
        "frameworks": [],
        "databases": [],
        "devops_cloud": [],
        "tools_concepts": []
    }
    
    lower_text = text.lower()
    for lang in COMMON_SKILLS_CATALOG["languages"]:
        pattern = r'(?<![a-zA-Z0-9_#+])' + re.escape(lang) + r'(?![a-zA-Z0-9_#+])'
        if re.search(pattern, lower_text):
            matched_skills["languages"].append(lang.capitalize() if len(lang) > 3 else lang.upper())
            
    for fw in COMMON_SKILLS_CATALOG["frameworks"]:
        pattern = r'(?<![a-zA-Z0-9_#+])' + re.escape(fw) + r'(?![a-zA-Z0-9_#+])'
        if re.search(pattern, lower_text):
            matched_skills["frameworks"].append(fw.title())
            
    for db in COMMON_SKILLS_CATALOG["databases"]:
        pattern = r'(?<![a-zA-Z0-9_#+])' + re.escape(db) + r'(?![a-zA-Z0-9_#+])'
        if re.search(pattern, lower_text):
            matched_skills["databases"].append(db.capitalize())
            
    for dc in COMMON_SKILLS_CATALOG["devops_cloud"]:
        pattern = r'(?<![a-zA-Z0-9_#+])' + re.escape(dc) + r'(?![a-zA-Z0-9_#+])'
        if re.search(pattern, lower_text):
            matched_skills["devops_cloud"].append(dc.upper() if len(dc) <= 4 else dc.title())
            
    for tc in COMMON_SKILLS_CATALOG["tools_concepts"]:
        pattern = r'(?<![a-zA-Z0-9_#+])' + re.escape(tc) + r'(?![a-zA-Z0-9_#+])'
        if re.search(pattern, lower_text):
            matched_skills["tools_concepts"].append(tc.title())

    # Combine all unique skills
    all_skills_flat = []
    for cat, items in matched_skills.items():
        all_skills_flat.extend(items)
    all_skills_flat = list(dict.fromkeys(all_skills_flat))

    # 4. Extract Structured Projects (Only from projects section, never treat projects as professional employment)
    project_source_text = sections["projects"]
    if not project_source_text.strip() and not sections["experience"].strip():
        # Fallback to text only if no experience section exists
        project_source_text = text
    parsed_projects = extract_structured_projects(project_source_text, candidate_name=candidate_name)
    
    # 5. Extract Structured Internships & Professional Employment Separately
    parsed_internships = extract_structured_internships(sections["internships"])
    
    # Professional experience is ONLY extracted from the designated experience section - NEVER fall back to full text!
    raw_exp_text = sections["experience"].strip()
    parsed_experience = extract_structured_experience(raw_exp_text) if raw_exp_text else []
    
    # If any experience entry was actually an internship, move it to internships
    clean_experience = []
    for exp in parsed_experience:
        hdr = exp.get("role_header", "").lower()
        if "intern" in hdr or "internship" in hdr or "trainee" in hdr:
            parsed_internships.append({
                "role_header": exp.get("role_header"),
                "summary": exp.get("summary"),
                "type": "Internship"
            })
        else:
            clean_experience.append(exp)
            
    # 6. Extract Coursework & Certifications
    parsed_coursework = extract_coursework(sections["education"] + "\n" + sections["skills"] + "\n" + text)
    parsed_certifications = extract_certifications(sections["certifications"] + "\n" + text)

    return {
        "candidate_name": candidate_name,
        "email": email,
        "phone": phone,
        "links": {
            "github": github,
            "linkedin": linkedin
        },
        "raw_text": text,
        "sections": {k: v.strip() for k, v in sections.items()},
        "skills_categorized": matched_skills,
        "all_skills": all_skills_flat,
        "projects": parsed_projects,
        "experience": clean_experience,
        "internships": parsed_internships,
        "education": sections["education"].strip(),
        "coursework": parsed_coursework,
        "certifications": parsed_certifications,
        "has_professional_experience": len(clean_experience) > 0,
        "has_internships": len(parsed_internships) > 0,
        "has_academic_projects": len(parsed_projects) > 0,
        "word_count": len(text.split())
    }

def extract_structured_projects(text: str, candidate_name: str = "") -> List[Dict[str, Any]]:
    projects = []
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    current_proj = None
    
    academic_indicators = ["academic", "capstone", "coursework", "hackathon", "college", "university", "final year", "mini project"]
    cand_name_lower = candidate_name.strip().lower() if candidate_name else ""
    
    for line in lines:
        line_lower = line.lower()
        # Guard: do not pick up degree headers as projects
        if any(deg in line_lower for deg in ["b.tech", "b.e", "b.s", "m.tech", "m.s", "bachelor", "master", "gpa", "cgpa"]):
            continue
        # Guard: do not pick up candidate name or contact lines as projects
        if cand_name_lower and cand_name_lower in line_lower:
            continue
        if any(contact in line_lower for contact in ["@", "github.com", "linkedin.com", "phone", "email", "objective", "profile", "summary"]):
            continue
            
        # Check if line looks like a project header (e.g. "E-Commerce App | React, Node.js" or "Project Alpha:")
        has_delim = bool(re.search(r'\s+[–—|]\s+|\s+-\s+|:\s*', line))
        is_bullet = line.startswith(('•', '-', '*', '>', '–'))
            
        if (has_delim or len(line.split()) <= 6) and not is_bullet:
            if current_proj and current_proj.get("title"):
                projects.append(current_proj)
            parts = re.split(r'\s+[–—|]\s+|\s+-\s+|:\s*', line, maxsplit=1)
            title = parts[0].strip()
            tools = parts[1].strip() if len(parts) > 1 else ""
            
            is_academic = any(ai in line_lower for ai in academic_indicators)
            
            current_proj = {
                "title": title,
                "tools": tools,
                "is_academic": is_academic,
                "description": []
            }
        elif current_proj:
            clean_desc = line.lstrip('•-*–> ').strip()
            if clean_desc:
                current_proj["description"].append(clean_desc)
                
    if current_proj and current_proj.get("title"):
        projects.append(current_proj)
        
    # Clean up project items
    results = []
    for p in projects[:6]: # top 6 projects
        title_lower = p["title"].lower()
        if cand_name_lower and cand_name_lower in title_lower:
            continue
        if len(p["title"]) > 2 and not any(kw in title_lower for kw in ['experience', 'education', 'technologies', 'skills', 'certifications', 'summary', 'achievements', 'objective']):
            desc_text = " ".join(p["description"])
            results.append({
                "title": p["title"],
                "tools": p["tools"],
                "is_academic": p.get("is_academic", True),
                "summary": desc_text[:250] + ("..." if len(desc_text) > 250 else "")
            })
            
    # Fallback default project if none matched
    if not results and text:
        results.append({
            "title": "Academic Software Project",
            "tools": "Key technologies from resume",
            "is_academic": True,
            "summary": "Hands-on software implementation and feature delivery documented in resume."
        })
        
    return results

def extract_structured_internships(text: str) -> List[Dict[str, Any]]:
    if not text or not text.strip():
        return []
    internships = []
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    current_intern = None
    for line in lines:
        has_date = bool(re.search(r'(?:20\d\d|19\d\d|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b)', line, re.IGNORECASE))
        is_bullet = line.startswith(('•', '-', '*', '>', '–'))
        
        if (has_date or ('|' in line and not is_bullet)) and len(line) < 110:
            if current_intern and current_intern.get("role_header"):
                internships.append(current_intern)
            current_intern = {
                "role_header": line,
                "details": [],
                "type": "Internship"
            }
        elif current_intern and is_bullet:
            current_intern["details"].append(line.lstrip('•-*–> ').strip())
            
    if current_intern and current_intern.get("role_header"):
        internships.append(current_intern)
        
    formatted = []
    for item in internships[:3]:
        details_str = " ".join(item["details"])
        formatted.append({
            "role_header": item["role_header"],
            "summary": details_str[:250] + ("..." if len(details_str) > 250 else ""),
            "type": "Internship"
        })
    return formatted

def extract_structured_experience(text: str) -> List[Dict[str, Any]]:
    if not text or not text.strip():
        return []
    experiences = []
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    academic_stop_words = [
        "bachelor", "master", "ph.d", "phd", "b.tech", "b.e", "b.s", "m.tech", "m.s", 
        "degree", "university", "college", "school", "high school", "gpa", "cgpa",
        "intermediate", "matriculation"
    ]
    
    current_exp = None
    for line in lines:
        # Filter out education lines accidentally caught
        if any(w in line.lower() for w in academic_stop_words):
            continue
            
        # Look for company/title indicators or date ranges (e.g., 2021 - 2024, May 2022 - Present)
        has_date = bool(re.search(r'(?:20\d\d|19\d\d|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b).*?(?:20\d\d|Present|Current)', line, re.IGNORECASE))
        is_bullet = line.startswith(('•', '-', '*', '>', '–'))
        
        if (has_date or ('|' in line and not is_bullet)) and len(line) < 110:
            if current_exp and current_exp.get("company_or_role"):
                experiences.append(current_exp)
            current_exp = {
                "company_or_role": line,
                "details": []
            }
        elif current_exp and is_bullet:
            current_exp["details"].append(line.lstrip('•-*–> ').strip())
            
    if current_exp and current_exp.get("company_or_role"):
        experiences.append(current_exp)
        
    formatted = []
    for e in experiences[:4]:
        details_str = " ".join(e["details"])
        formatted.append({
            "role_header": e["company_or_role"],
            "summary": details_str[:250] + ("..." if len(details_str) > 250 else "")
        })
    return formatted

def extract_coursework(text: str) -> List[str]:
    found = []
    cs_coursework_catalog = [
        "Data Structures & Algorithms",
        "Object-Oriented Programming (OOP)",
        "Database Management Systems (DBMS)",
        "Operating Systems",
        "Computer Networks",
        "Software Engineering",
        "Web Development",
        "Machine Learning",
        "Artificial Intelligence",
        "Cloud Computing",
        "System Design",
        "Compiler Design",
        "Computer Architecture",
        "Information Security"
    ]
    lower = text.lower()
    for course in cs_coursework_catalog:
        pattern = r'\b' + re.escape(course.split('(')[0].strip().lower()) + r'\b'
        if re.search(pattern, lower):
            found.append(course)
    return list(dict.fromkeys(found))[:6]

def extract_certifications(text: str) -> List[str]:
    certifications = []
    cert_keywords = [
        "aws certified", "google cloud", "azure", "coursera", "meta", "oracle certified",
        "hackerrank", "freecodecamp", "udemy", "certified kubernetes", "cisco", "comptia"
    ]
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for line in lines:
        if any(ck in line.lower() for ck in cert_keywords) and len(line) < 100:
            clean_cert = line.lstrip('•-*–> ').strip()
            if clean_cert and clean_cert not in certifications:
                certifications.append(clean_cert)
    return certifications[:5]
