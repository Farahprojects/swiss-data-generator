
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrphanedFile {
  name: string;
  size: number;
  lastModified: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify admin access (you might want to implement proper admin verification)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: corsHeaders }
      )
    }

    // Get all files from storage
    const { data: files, error: filesError } = await supabase.storage
      .from('website-images')
      .list('', {
        limit: 1000,
        offset: 0,
      })

    if (filesError) {
      console.error('Error listing files:', filesError)
      return new Response(
        JSON.stringify({ error: 'Failed to list files' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Get all file references from database
    const { data: websites, error: websitesError } = await supabase
      .from('coach_websites')
      .select('customization_data, draft_customization_data')

    if (websitesError) {
      console.error('Error fetching websites:', websitesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch website data' }),
        { status: 500, headers: corsHeaders }
      )
    }

    // Extract all referenced file paths
    const referencedPaths = new Set<string>()
    
    websites?.forEach((website) => {
      const data = website.customization_data || {}
      const draftData = website.draft_customization_data || {}
      
      // Check header images
      [data, draftData].forEach((d) => {
        if (d.headerImageData?.filePath) referencedPaths.add(d.headerImageData.filePath)
        if (d.aboutImageData?.filePath) referencedPaths.add(d.aboutImageData.filePath)
        
        // Check service images
        if (d.services && Array.isArray(d.services)) {
          d.services.forEach((service: any) => {
            if (service.imageData?.filePath) referencedPaths.add(service.imageData.filePath)
          })
        }
      })
    })

    // Find orphaned files
    const orphanedFiles: OrphanedFile[] = []
    const allStorageFiles: string[] = []

    const processFiles = (fileList: any[], prefix = '') => {
      fileList.forEach((file) => {
        const fullPath = prefix ? `${prefix}/${file.name}` : file.name
        allStorageFiles.push(fullPath)
        
        if (!referencedPaths.has(fullPath)) {
          orphanedFiles.push({
            name: fullPath,
            size: file.metadata?.size || 0,
            lastModified: file.updated_at || file.created_at
          })
        }
      })
    }

    processFiles(files || [])

    // Optionally, list files in subdirectories (user folders)
    const { data: userFolders } = await supabase.storage
      .from('website-images')
      .list('', { limit: 100 })

    if (userFolders) {
      for (const folder of userFolders) {
        if (folder.name && folder.id) {
          const { data: userFiles } = await supabase.storage
            .from('website-images')
            .list(folder.name, { limit: 1000 })
          
          if (userFiles) {
            processFiles(userFiles, folder.name)
          }
        }
      }
    }

    // If cleanup=true is passed, actually delete the orphaned files
    const url = new URL(req.url)
    const shouldCleanup = url.searchParams.get('cleanup') === 'true'
    
    let deletedCount = 0
    if (shouldCleanup) {
      const pathsToDelete = orphanedFiles.map(f => f.name)
      
      if (pathsToDelete.length > 0) {
        const { data: deleteResult, error: deleteError } = await supabase.storage
          .from('website-images')
          .remove(pathsToDelete)
        
        if (deleteError) {
          console.error('Error deleting files:', deleteError)
        } else {
          deletedCount = deleteResult?.length || 0
          console.log(`Deleted ${deletedCount} orphaned files`)
        }
      }
    }

    const response = {
      totalFiles: allStorageFiles.length,
      referencedFiles: referencedPaths.size,
      orphanedFiles: orphanedFiles.length,
      orphanedList: orphanedFiles,
      deletedCount: shouldCleanup ? deletedCount : 0,
      message: shouldCleanup 
        ? `Cleanup complete. Deleted ${deletedCount} orphaned files.`
        : `Found ${orphanedFiles.length} orphaned files. Add ?cleanup=true to delete them.`
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
