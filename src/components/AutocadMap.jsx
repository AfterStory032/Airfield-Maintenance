import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useDarkMode } from '../context/DarkModeContext';
import { supabase } from '../lib/supabase';

function AutocadMap() {
  const { currentUser } = useAuth();
  const { darkMode } = useDarkMode();
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layers, setLayers] = useState([
    { id: 1, name: 'Runways', visible: true },
    { id: 2, name: 'Taxiways', visible: true },
    { id: 3, name: 'Buildings', visible: true },
    { id: 4, name: 'Lighting Systems', visible: true },
    { id: 5, name: 'Navigation Aids', visible: false },
  ]);
  const [mapAnnotations, setMapAnnotations] = useState([]);
  const [newAnnotation, setNewAnnotation] = useState({ text: '', position: { x: 0, y: 0 } });
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [mapPosition, setMapPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Check if current user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      try {
        if (currentUser?.role === 'admin') {
          setIsAdmin(true);
          return;
        }

        // If Supabase is connected, check from database
        if (supabase) {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single();

          if (!error && data && data.role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [currentUser]);

  // Fetch map annotations from Supabase if available
  useEffect(() => {
    const fetchMapAnnotations = async () => {
      try {
        if (supabase) {
          const { data, error } = await supabase
            .from('map_annotations')
            .select('*');

          if (!error && data) {
            setMapAnnotations(data);
          } else {
            // Fallback to demo annotations
            setMapAnnotations([
              { id: 1, text: 'Runway 27L - Maintenance Scheduled', position: { x: 120, y: 150 } },
              { id: 2, text: 'Taxiway B - Recent Repairs', position: { x: 250, y: 200 } }
            ]);
          }
        } else {
          // Use demo data if no Supabase
          setMapAnnotations([
            { id: 1, text: 'Runway 27L - Maintenance Scheduled', position: { x: 120, y: 150 } },
            { id: 2, text: 'Taxiway B - Recent Repairs', position: { x: 250, y: 200 } }
          ]);
        }
      } catch (error) {
        console.error('Error fetching map annotations:', error);
      }
    };

    fetchMapAnnotations();
  }, []);

  const toggleLayer = (layerId) => {
    setLayers(layers.map(layer => 
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const handleZoomIn = () => {
    setZoomLevel(Math.min(zoomLevel * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(Math.max(zoomLevel / 1.2, 0.5));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setMapPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (editMode && isAdmin) {
      // In edit mode, place annotation
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - mapPosition.x;
      const y = (e.clientY - rect.top) / zoomLevel - mapPosition.y;
      setNewAnnotation({ ...newAnnotation, position: { x, y } });
    } else {
      // In view mode, start dragging
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && !editMode) {
      const deltaX = (e.clientX - dragStart.x) / zoomLevel;
      const deltaY = (e.clientY - dragStart.y) / zoomLevel;
      setMapPosition({
        x: mapPosition.x + deltaX,
        y: mapPosition.y + deltaY
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleAddAnnotation = async () => {
    if (!newAnnotation.text) return;

    const annotationToAdd = {
      id: Date.now(),
      text: newAnnotation.text,
      position: newAnnotation.position
    };

    try {
      // Try to save to Supabase if available
      if (supabase && isAdmin) {
        const { data, error } = await supabase
          .from('map_annotations')
          .insert([{
            text: annotationToAdd.text,
            position_x: annotationToAdd.position.x,
            position_y: annotationToAdd.position.y,
            created_by: currentUser?.id
          }])
          .select();

        if (!error && data) {
          // Use the returned data with the database ID
          annotationToAdd.id = data[0].id;
        }
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
    } finally {
      // Add to local state regardless of database success
      setMapAnnotations([...mapAnnotations, annotationToAdd]);
      setNewAnnotation({ text: '', position: { x: 0, y: 0 } });
    }
  };

  const handleDeleteAnnotation = async (id) => {
    try {
      // Try to delete from Supabase if available
      if (supabase && isAdmin) {
        await supabase
          .from('map_annotations')
          .delete()
          .eq('id', id);
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
    } finally {
      // Remove from local state regardless of database success
      setMapAnnotations(mapAnnotations.filter(annotation => annotation.id !== id));
      setSelectedAnnotation(null);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          AutoCAD Map
        </h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className={`px-4 py-2 rounded-md ${editMode 
                ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            >
              {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
            </button>
          </div>
        )}
      </div>

      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} p-6 rounded-lg shadow-md`}>
        {/* Map Display */}
        <div 
          className="border-2 border-gray-300 dark:border-gray-600 p-4 rounded-lg relative overflow-hidden"
          style={{ height: '500px', cursor: isDragging ? 'grabbing' : editMode ? 'crosshair' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Placeholder for actual map */}
          <div 
            className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700"
            style={{ 
              transform: `scale(${zoomLevel}) translate(${mapPosition.x}px, ${mapPosition.y}px)`,
              transformOrigin: 'center',
            }}
          >
            <div className="relative w-full h-full">
              {/* Airport runways illustration */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                {layers.find(l => l.name === 'Runways')?.visible && (
                  <>
                    {/* Main runway */}
                    <div className="bg-gray-800 dark:bg-gray-300 h-8 w-96 relative">
                      <div className="absolute inset-x-0 h-full flex items-center justify-between px-2">
                        <span className="text-white dark:text-black text-xs">09</span>
                        <span className="text-white dark:text-black text-xs">27</span>
                      </div>
                    </div>
                    {/* Secondary runway */}
                    <div className="bg-gray-800 dark:bg-gray-300 h-8 w-80 absolute -rotate-45 -top-20 left-8">
                      <div className="absolute inset-x-0 h-full flex items-center justify-between px-2">
                        <span className="text-white dark:text-black text-xs">14</span>
                        <span className="text-white dark:text-black text-xs">32</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Taxiways */}
                {layers.find(l => l.name === 'Taxiways')?.visible && (
                  <>
                    <div className="bg-blue-600 h-4 w-40 absolute top-10 left-20"></div>
                    <div className="bg-blue-600 h-4 w-32 absolute -top-10 right-20 rotate-45"></div>
                    <div className="bg-blue-600 h-4 w-24 absolute top-0 -left-30"></div>
                  </>
                )}

                {/* Buildings */}
                {layers.find(l => l.name === 'Buildings')?.visible && (
                  <>
                    <div className="bg-gray-500 dark:bg-gray-400 h-12 w-24 absolute -bottom-24 left-16"></div>
                    <div className="bg-gray-500 dark:bg-gray-400 h-8 w-16 absolute -bottom-40 right-10"></div>
                    <div className="bg-gray-500 dark:bg-gray-400 h-10 w-20 absolute -top-48 left-10"></div>
                  </>
                )}

                {/* Navigation Aids */}
                {layers.find(l => l.name === 'Navigation Aids')?.visible && (
                  <>
                    <div className="bg-red-500 h-4 w-4 rounded-full absolute top-20 right-10"></div>
                    <div className="bg-red-500 h-4 w-4 rounded-full absolute -bottom-20 left-10"></div>
                  </>
                )}
                
                {/* Lighting Systems */}
                {layers.find(l => l.name === 'Lighting Systems')?.visible && (
                  <>
                    <div className="flex absolute -right-40 top-0 space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-yellow-400 h-2 w-2 rounded-full"></div>
                      ))}
                    </div>
                    <div className="flex absolute -left-40 top-0 space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="bg-yellow-400 h-2 w-2 rounded-full"></div>
                      ))}
                    </div>
                  </>
                )}

                {/* Map annotations */}
                {mapAnnotations.map(annotation => (
                  <div 
                    key={annotation.id}
                    className={`absolute cursor-pointer ${selectedAnnotation === annotation.id ? 'bg-blue-100 dark:bg-blue-900' : 'bg-white dark:bg-gray-800'} p-2 rounded shadow-md text-xs max-w-xs border-2 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                    style={{ left: `${annotation.position.x}px`, top: `${annotation.position.y}px` }}
                    onClick={() => setSelectedAnnotation(selectedAnnotation === annotation.id ? null : annotation.id)}
                  >
                    <p>{annotation.text}</p>
                    {isAdmin && selectedAnnotation === annotation.id && (
                      <button 
                        className="mt-1 text-red-500 hover:text-red-700 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAnnotation(annotation.id);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Admin annotation editor overlay */}
          {editMode && isAdmin && (
            <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-md shadow-lg border border-gray-300 dark:border-gray-600">
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newAnnotation.text}
                  onChange={(e) => setNewAnnotation({...newAnnotation, text: e.target.value})}
                  placeholder="Enter annotation text..."
                  className="flex-grow px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <button 
                  onClick={handleAddAnnotation}
                  disabled={!newAnnotation.text}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
                Click on the map to place annotation
              </p>
            </div>
          )}
        </div>

        {/* Map controls */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button 
            onClick={handleZoomIn}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Zoom In
          </button>
          <button 
            onClick={handleZoomOut}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Zoom Out
          </button>
          <button 
            onClick={handleResetView}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded dark:text-white"
          >
            Reset View
          </button>

          {/* Layer toggler dropdown */}
          <div className="relative ml-auto">
            <details className="group">
              <summary className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-4 py-2 rounded dark:text-white cursor-pointer list-none flex items-center gap-2">
                <span>Toggle Layers</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 dark:divide-gray-700 z-10">
                <div className="py-1">
                  {layers.map(layer => (
                    <label 
                      key={layer.id} 
                      className="flex items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input 
                        type="checkbox" 
                        checked={layer.visible} 
                        onChange={() => toggleLayer(layer.id)} 
                        className="mr-2"
                      />
                      {layer.name}
                    </label>
                  ))}
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AutocadMap;