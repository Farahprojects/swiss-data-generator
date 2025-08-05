
-- Insert the Abstract template into the website_templates table
INSERT INTO public.website_templates (
  name,
  description,
  template_data,
  is_active
) VALUES (
  'Abstract',
  'Sophisticated geometric design with artistic elements and morphing shapes',
  '{
    "defaultContent": {
      "hero": {
        "title": "Abstract Mind",
        "subtitle": "Where consciousness meets creativity in transformative coaching"
      },
      "about": {
        "title": "Philosophy in Motion",
        "content": "Through abstract thinking and creative methodologies, I guide individuals toward profound self-discovery. Each session is a unique canvas where traditional coaching meets artistic expression."
      },
      "services": {
        "title": "Transformative Experiences",
        "defaultServices": [
          {
            "title": "Abstract Service",
            "description": "A unique coaching experience that transcends traditional boundaries",
            "price": "Contact for details"
          }
        ]
      },
      "cta": {
        "heading": "Ready to Transcend?",
        "subheading": "Step into a realm where transformation takes artistic form",
        "buttonText": "Begin Transformation"
      }
    },
    "designElements": {
      "colorScheme": "abstract",
      "primaryColors": ["#6B46C1", "#8B5CF6", "#A855F7"],
      "backgroundStyle": "geometric",
      "animations": ["morphing", "floating", "geometric"],
      "typography": "artistic"
    },
    "features": [
      "Geometric background patterns",
      "Morphing shape animations",
      "Artistic typography combinations",
      "Abstract visual elements",
      "Sophisticated color palettes"
    ]
  }'::jsonb,
  true
);
