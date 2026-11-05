from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
import docx

def create_sample_pdf(output_path: Path):
    doc = SimpleDocTemplate(str(output_path), pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontSize=16, spaceAfter=8)
    h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=12, spaceAfter=6, spaceBefore=10)
    body_style = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, spaceAfter=6)

    story = [
        Paragraph("System Design & Distributed Scalability Reference Guide", title_style),
        Paragraph("Category: System Architecture & Distributed Systems", body_style),
        Spacer(1, 10),
        Paragraph("Section 1: Horizontal vs Vertical Scaling", h2_style),
        Paragraph("Vertical scaling (scaling up) adds more compute, RAM, or faster NVMe disks to an existing single machine. It is simple but bounded by physical hardware limits and introduces a single point of failure (SPOF). Horizontal scaling (scaling out) adds more commodity instances to a distributed cluster, requiring load balancers and stateless application servers.", body_style),
        Spacer(1, 6),
        Paragraph("Section 2: Caching Strategies (Cache-Aside, Write-Through, Write-Behind)", h2_style),
        Paragraph("In Cache-Aside (Lazy Loading), the application queries Redis first; on a cache miss, it fetches data from PostgreSQL, populates Redis, and returns the result. In Write-Through, updates write to the cache and the database synchronously, ensuring consistency at the expense of write latency. In Write-Behind (Write-Back), updates write to the cache immediately and asynchronously flush to disk, boosting write throughput.", body_style),
        Spacer(1, 6),
        Paragraph("Section 3: Database Sharding and Consistent Hashing", h2_style),
        Paragraph("Sharding partitions large database tables horizontally across distinct database servers using a shard key (e.g., hash(user_id) % num_shards). To prevent catastrophic re-shuffling when nodes are added or removed, distributed architectures employ Consistent Hashing mapped onto a 360-degree virtual ring with virtual nodes (vnodes) to evenly balance shard load.", body_style)
    ]
    doc.build(story)
    print(f"Created sample PDF: {output_path}")

def create_sample_docx(output_path: Path):
    doc = docx.Document()
    doc.add_heading("Cloud Microservices & Resilience Patterns", level=1)
    doc.add_paragraph("Category: Cloud Architecture & DevOps")
    
    doc.add_heading("Section 1: The Circuit Breaker Pattern", level=2)
    doc.add_paragraph(
        "In a distributed microservice topology, cascading failures occur when an upstream service repeatedly waits on a slow, degraded downstream service. "
        "The Circuit Breaker pattern (popularized by Netflix Hystrix and Resilience4j) wraps network requests. It transitions between three states: "
        "Closed (normal operations; calls flow through), Open (failures exceed threshold; calls fail fast immediately without waiting for timeouts), "
        "and Half-Open (periodically sends a small test probe to verify if the downstream service has recovered)."
    )
    
    doc.add_heading("Section 2: Message Queues & Event-Driven Decoupling", level=2)
    doc.add_paragraph(
        "Using Apache Kafka or RabbitMQ decouples request ingestion from backend processing. "
        "Producers publish events asynchronously, enabling backpressure management and spike smoothing without dropping incoming HTTP transactions. "
        "Idempotency keys ensure that duplicate message deliveries (at-least-once delivery semantics) do not trigger duplicate database mutations."
    )
    
    doc.add_heading("Section 3: The CAP Theorem & PACELC Theorem", level=2)
    doc.add_paragraph(
        "In distributed data stores, Brewer's CAP Theorem proves that a distributed system can simultaneously provide at most two out of three guarantees: "
        "1. Consistency (C): Every read receives the most recent write or an error (linearizability). "
        "2. Availability (A): Every non-failing node returns a non-error response, without guaranteeing it is the most recent write. "
        "3. Partition Tolerance (P): The cluster continues to operate despite arbitrary packet loss or network partitions between nodes. "
        "Because physical network cables, switches, and cloud interconnects inevitably fail, Partition Tolerance (P) is mandatory in real-world distributed architectures. "
        "Therefore, distributed architects must choose between CP (Consistency over Availability, e.g., HBase, etcd, ZooKeeper) or AP (Availability over Consistency, e.g., Apache Cassandra, Amazon DynamoDB, CouchDB) during a network partition. "
        "The PACELC Theorem extends CAP by explaining system behavior during normal operating conditions: "
        "If there is a Partition (P), how does the system trade off Availability (A) and Consistency (C); Else (E), when the network is healthy, how does the system trade off Latency (L) and Consistency (C)? "
        "For example, DynamoDB and Cassandra are PA/EL systems (prioritize Availability during partitions, and minimize Latency during normal operations). "
        "In contrast, HBase, BigTable, and MongoDB are PC/EC systems (strictly prioritizing Consistency under both partitioned and normal states)."
    )
    
    doc.save(str(output_path))
    print(f"Created sample DOCX: {output_path}")

if __name__ == "__main__":
    kb = Path(__file__).resolve().parent
    create_sample_pdf(kb / "system_design_interview_handbook.pdf")
    create_sample_docx(kb / "distributed_systems_patterns.docx")

