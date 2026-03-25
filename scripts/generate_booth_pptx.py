from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def set_background(slide, color):
    bg = slide.background
    fill = bg.fill
    fill.solid()
    fill.fore_color.rgb = color

def create_presentation():
    # 1. Initialize presentation
    prs = Presentation()
    
    # 2. Set dimensions to 16:9 Widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # 3. Define brand colors
    NAVY = RGBColor(15, 40, 71)    # #0F2847 - Deep navy
    ORANGE = RGBColor(245, 158, 11)  # #F59E0B - Vibrant orange
    WHITE = RGBColor(255, 255, 255)
    LIGHT_BLUE = RGBColor(59, 130, 246)

    blank_layout = prs.slide_layouts[6]

    # -- SLIDE 1: TITLE --
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide, NAVY)
    
    # Title image: Team logo
    try:
        # Assuming logo-readme is wide and transparent
        slide.shapes.add_picture('assets/logo-readme.png', Inches(4.16), Inches(2.2), width=Inches(5))
    except Exception as e:
        print("Note: Logo not found or unreadable, skipping logo on title.", e)

    txBox = slide.shapes.add_textbox(Inches(1), Inches(4.2), Inches(11.33), Inches(1.5))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = "AI-Augmented DME Fraud Detection"
    p.font.size = Pt(54)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.alignment = PP_ALIGN.CENTER
    
    p2 = tf.add_paragraph()
    p2.text = "Human-in-the-Loop Pattern Modeling for Medicare Program Integrity"
    p2.font.size = Pt(28)
    p2.font.bold = False
    p2.font.color.rgb = ORANGE
    p2.alignment = PP_ALIGN.CENTER
    
    # Add a thin orange bar at the bottom
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.2), Inches(13.333), Inches(0.3))
    shape.fill.solid()
    shape.fill.fore_color.rgb = ORANGE
    shape.line.fill.background()

    # -- Helper to standard image slide --
    def add_image_slide(title_text, image_path):
        s = prs.slides.add_slide(blank_layout)
        set_background(s, NAVY)
        
        # Title
        tb = s.shapes.add_textbox(Inches(0.5), Inches(0.2), Inches(12.33), Inches(0.8))
        tf = tb.text_frame
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(40)
        p.font.bold = True
        p.font.color.rgb = ORANGE
        
        # Image bounding box
        img_left = Inches(1.66)
        img_top = Inches(1.15)
        img_width = Inches(10)
        
        try:
            s.shapes.add_picture(image_path, img_left, img_top, width=img_width)
        except Exception as e:
            print(f"Note: Image {image_path} not found. Skipping image.")

        # Decorative bar
        shape = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.2), Inches(13.333), Inches(0.3))
        shape.fill.solid()
        shape.fill.fore_color.rgb = LIGHT_BLUE
        shape.line.fill.background()
        
        return s

    # -- SLIDE 2: THE PROBLEM --
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide, NAVY)
    txBox = slide.shapes.add_textbox(Inches(1), Inches(1.5), Inches(11.33), Inches(4))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = "The Problem: $60B+ Lost Annually"
    p.font.size = Pt(64)
    p.font.bold = True
    p.font.color.rgb = ORANGE
    p.alignment = PP_ALIGN.CENTER
    
    p2 = tf.add_paragraph()
    p2.text = "\nTraditional detection stops at the generic threshold.\nModern organized fraud is fragmented across coordinated networks."
    p2.font.size = Pt(36)
    p2.font.color.rgb = WHITE
    p2.alignment = PP_ALIGN.CENTER
    
    # -- SLIDE 3: COMMAND CENTER --
    add_image_slide("Command Center: Global Risk Intelligence", 'assets/screenshot-dashboard.png')

    # -- SLIDE 4: NETWORK CLUSTER --
    add_image_slide("Behavioral Clustering: Catching the Network", 'assets/screenshot-clusters.png')

    # -- SLIDE 5: EXPLAINABLE AI --
    add_image_slide("Explainable AI: Contextual Justifications", 'assets/screenshot-ai-narrative.png')

    # -- SLIDE 6: HUMAN IN THE LOOP --
    add_image_slide("Human-in-the-Loop: You Shape the Model", 'assets/screenshot-investigation.png')

    # -- SLIDE 7: AI QUERY --
    add_image_slide("Natural Language Investigation", 'assets/screenshot-ai-query.png')

    # -- SLIDE 8: CALL TO ACTION --
    slide = prs.slides.add_slide(blank_layout)
    set_background(slide, NAVY)
    txBox = slide.shapes.add_textbox(Inches(1), Inches(2.5), Inches(11.33), Inches(2))
    tf = txBox.text_frame
    p = tf.paragraphs[0]
    p.text = "Ready to go beyond traditional fraud detection?"
    p.font.size = Pt(54)
    p.font.bold = True
    p.font.color.rgb = WHITE
    p.alignment = PP_ALIGN.CENTER
    
    p2 = tf.add_paragraph()
    p2.text = "\nStop by for a live investigation demo!"
    p2.font.size = Pt(44)
    p2.font.bold = True
    p2.font.color.rgb = ORANGE
    p2.alignment = PP_ALIGN.CENTER
    
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.2), Inches(13.333), Inches(0.3))
    shape.fill.solid()
    shape.fill.fore_color.rgb = ORANGE
    shape.line.fill.background()

    # 4. Save
    output_path = 'assets/Sky_Sentinel_Booth_Loop.pptx'
    prs.save(output_path)
    print(f"Successfully generated PowerPoint deck at {output_path}")

if __name__ == "__main__":
    create_presentation()
