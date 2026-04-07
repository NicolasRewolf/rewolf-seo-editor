import { Route, Routes } from 'react-router-dom'

import { SeoEditor } from '@/app/editor/SeoEditor'
import { ProjectsPage } from '@/app/projects/ProjectsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<SeoEditor />} />
      <Route path="/projects" element={<ProjectsPage />} />
    </Routes>
  )
}

export default App
