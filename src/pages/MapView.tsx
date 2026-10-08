import { useEffect, useState, useRef } from 'react';
import { ThumbsUp, MessageSquare, Filter, X, MapPin, Clock } from 'lucide-react';

// Get current user from localStorage
function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  if (userStr) {
    return JSON.parse(userStr);
  }
  const defaultUser = {
    id: 'user_' + Date.now(),
    email: 'user@example.com',
    displayName: 'Anonymous User'
  };
  localStorage.setItem('currentUser', JSON.stringify(defaultUser));
  return defaultUser;
}

const MapView = () => {
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [currentUser] = useState(getCurrentUser().id);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const initializingRef = useRef(false);

  // Load issues from localStorage
  useEffect(() => {
    const loadIssues = () => {
      const issuesStr = localStorage.getItem('issues');
      if (issuesStr) {
        const loadedIssues = JSON.parse(issuesStr);
        setIssues(loadedIssues);
        setFilteredIssues(loadedIssues);
      } else {
        setIssues([]);
        setFilteredIssues([]);
      }
    };
    
    loadIssues();
    
    const handleStorageChange = (e) => {
      if (e.key === 'issues') {
        loadIssues();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load Leaflet CSS and JS
  useEffect(() => {
    if (window.L && document.querySelector('link[href*="leaflet"]')) {
      setLeafletLoaded(true);
      return;
    }

    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(cssLink);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      if (cssLink.parentNode) cssLink.remove();
      if (script.parentNode) script.remove();
    };
  }, []);

  // Initialize map once Leaflet is loaded
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current || initializingRef.current) {
      return;
    }

    initializingRef.current = true;

    const initMap = () => {
      try {
        const L = window.L;
        
        // Check if there's a stored map center from the report
        const mapCenterStr = localStorage.getItem('mapCenter');
        let initialCenter = [37.7749, -122.4194];
        
        if (mapCenterStr) {
          const mapCenter = JSON.parse(mapCenterStr);
          initialCenter = [mapCenter.lat, mapCenter.lng];
          localStorage.removeItem('mapCenter');
        }
        
        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true
        }).setView(initialCenter, 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);

        mapInstanceRef.current = map;
        setIsLoading(false);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLat = position.coords.latitude;
              const userLng = position.coords.longitude;
              
              if (!mapCenterStr) {
                map.setView([userLat, userLng], 13);
              }
              
              const userIcon = L.divIcon({
                className: 'user-location-marker',
                html: `
                  <div style="
                    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                  "></div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              });
              
              L.marker([userLat, userLng], { icon: userIcon })
                .addTo(map)
                .bindPopup('<strong>Your Location</strong>');
            },
            (error) => console.log('Location access denied')
          );
        }

        setTimeout(() => {
          map.invalidateSize();
        }, 100);
      } catch (error) {
        console.error('Error initializing map:', error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      initializingRef.current = false;
    };
  }, [leafletLoaded]);

  // Update markers when filtered issues change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    filteredIssues.forEach((issue, index) => {
      if (!issue.location) return;

      const color = getMarkerColor(issue.status);
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="marker-container" style="animation: markerDrop 0.5s ease-out ${index * 0.05}s both;">
            <div style="
              background-color: ${color};
              width: 32px;
              height: 32px;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              transition: all 0.3s ease;
            ">
              <div style="
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
              "></div>
            </div>
          </div>
          <style>
            @keyframes markerDrop {
              0% { 
                transform: translateY(-100px) scale(0);
                opacity: 0;
              }
              60% { 
                transform: translateY(5px) scale(1.1);
                opacity: 1;
              }
              100% { 
                transform: translateY(0) scale(1);
                opacity: 1;
              }
            }
            .marker-container:hover > div {
              transform: rotate(-45deg) scale(1.15);
              box-shadow: 0 6px 16px rgba(0,0,0,0.4);
            }
          </style>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([issue.location.lat, issue.location.lng], { icon })
        .addTo(map)
        .bindPopup(createPopupContent(issue), { 
          maxWidth: 300,
          className: 'custom-popup'
        });

      marker.on('popupopen', () => {
        setupPopupHandlers(issue);
      });

      markersRef.current.push(marker);
    });
  }, [filteredIssues, leafletLoaded, currentUser]);

  useEffect(() => {
    let filtered = issues;
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(issue => issue.category === categoryFilter);
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }
    
    setFilteredIssues(filtered);
  }, [issues, categoryFilter, statusFilter]);

  const getMarkerColor = (status) => {
    switch (status) {
      case 'open': return '#ef4444';
      case 'in-progress': return '#eab308';
      case 'resolved': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const createPopupContent = (issue) => {
    const statusColors = {
      'open': 'background: #fee2e2; color: #991b1b',
      'in-progress': 'background: #fef3c7; color: #92400e',
      'resolved': 'background: #dcfce7; color: #166534'
    };

    return `
      <div style="min-width: 250px; font-family: system-ui, -apple-system, sans-serif;">
        ${issue.imageURL ? `<img src="${issue.imageURL}" alt="${issue.title}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 12px;" />` : ''}
        <h3 style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #111;">${issue.title}</h3>
        <p style="font-size: 14px; color: #666; margin-bottom: 12px; line-height: 1.5;">${issue.description}</p>
        <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
          <span style="padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; background: #f3f4f6; color: #374151;">${issue.category}</span>
          <span style="padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; ${statusColors[issue.status]}">${issue.status.replace('-', ' ')}</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="upvote-${issue.id}" style="
            flex: 1;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            border: 2px solid ${issue.upvotes.includes(currentUser) ? '#3b82f6' : '#e5e7eb'};
            background: ${issue.upvotes.includes(currentUser) ? '#3b82f6' : 'white'};
            color: ${issue.upvotes.includes(currentUser) ? 'white' : '#374151'};
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s;
          " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
            👍 ${issue.upvotes.length}
          </button>
          <button id="details-${issue.id}" style="
            flex: 1;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            border: 2px solid #3b82f6;
            background: #3b82f6;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: all 0.2s;
          " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
            💬 Details
          </button>
        </div>
      </div>
    `;
  };

  const setupPopupHandlers = (issue) => {
    setTimeout(() => {
      const upvoteBtn = document.getElementById(`upvote-${issue.id}`);
      const detailsBtn = document.getElementById(`details-${issue.id}`);

      if (upvoteBtn) {
        upvoteBtn.onclick = () => handleUpvote(issue.id);
      }

      if (detailsBtn) {
        detailsBtn.onclick = () => {
          setSelectedIssue(issue);
          mapInstanceRef.current?.closePopup();
        };
      }
    }, 100);
  };

  const handleUpvote = (issueId) => {
    const updatedIssues = issues.map(issue => {
      if (issue.id === issueId) {
        const hasUpvoted = issue.upvotes.includes(currentUser);
        return {
          ...issue,
          upvotes: hasUpvoted 
            ? issue.upvotes.filter(id => id !== currentUser)
            : [...issue.upvotes, currentUser]
        };
      }
      return issue;
    });
    
    setIssues(updatedIssues);
    localStorage.setItem('issues', JSON.stringify(updatedIssues));
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedIssue) return;

    const comment = {
      id: Date.now().toString(),
      text: newComment,
      userId: currentUser,
      userName: 'Current User',
      createdAt: new Date().toISOString()
    };

    const updatedIssues = issues.map(issue => {
      if (issue.id === selectedIssue.id) {
        return {
          ...issue,
          comments: [...(issue.comments || []), comment]
        };
      }
      return issue;
    });

    setIssues(updatedIssues);
    localStorage.setItem('issues', JSON.stringify(updatedIssues));

    setSelectedIssue(prev => ({
      ...prev,
      comments: [...(prev.comments || []), comment]
    }));

    setNewComment('');
  };

  return (
    <div className="civic-map flex flex-col bg-background">
      <div className="bg-card border-b shadow-sm px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Community Issue Tracker</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Report and track local infrastructure issues</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-3 sm:gap-4 p-3 sm:p-6 overflow-hidden">
        <div className="bg-card rounded-xl shadow-md border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-foreground">Filters</h3>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card text-sm font-medium text-foreground transition-all"
              >
                <option value="all">All Categories</option>
                <option value="Road">Road</option>
                <option value="Garbage">Garbage</option>
                <option value="Water">Water</option>
                <option value="Waterlogging">Waterlogging</option>
                <option value="Streetlight">Streetlight</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="flex-1">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card text-sm font-medium text-foreground transition-all"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div className="flex items-center justify-center sm:justify-start px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-semibold text-blue-700">
                {filteredIssues.length} of {issues.length} issues
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-card rounded-xl shadow-lg border border-border overflow-hidden relative min-h-0">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-card bg-opacity-90 z-10">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-3"></div>
                <p className="text-muted-foreground font-medium">Loading map...</p>
              </div>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" style={{ minHeight: '400px' }} />
        </div>

        <div className="bg-card rounded-xl shadow-md border border-border p-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-500 shadow-md"></div>
              <span className="text-foreground font-medium">Open</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-yellow-500 shadow-md"></div>
              <span className="text-foreground font-medium">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 shadow-md"></div>
              <span className="text-foreground font-medium">Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {selectedIssue && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[9999] animate-fadeIn backdrop-blur-sm" 
          onClick={() => setSelectedIssue(null)}
        >
          <div 
            className="bg-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between shadow-md">
              <h2 className="text-xl font-bold text-white">{selectedIssue.title}</h2>
              <button 
                onClick={() => setSelectedIssue(null)} 
                className="p-2 hover:bg-card hover:bg-opacity-20 rounded-lg transition-all"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
              {selectedIssue.imageURL && (
                <img 
                  src={selectedIssue.imageURL} 
                  alt={selectedIssue.title}
                  className="w-full h-64 object-cover rounded-xl shadow-md"
                />
              )}
              
              <div>
                <h4 className="font-semibold mb-2 text-foreground flex items-center gap-2">
                  <span className="text-blue-500">📝</span> Description
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{selectedIssue.description}</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-4 py-1.5 bg-muted border border-border rounded-lg text-sm font-medium text-foreground">
                  {selectedIssue.category}
                </span>
                <span className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
                  selectedIssue.status === 'open' ? 'bg-red-100 text-red-800 border border-red-200' :
                  selectedIssue.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                  'bg-green-100 text-green-800 border border-green-200'
                }`}>
                  {selectedIssue.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>

              <button
                onClick={() => handleUpvote(selectedIssue.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
                  selectedIssue.upvotes.includes(currentUser)
                    ? 'bg-blue-500 text-white shadow-lg hover:bg-blue-600'
                    : 'bg-muted text-foreground border-2 border-border hover:bg-muted/80'
                }`}
              >
                <ThumbsUp className="h-5 w-5" />
                {selectedIssue.upvotes.length} Upvotes
              </button>

              <div className="border-t pt-5">
                <h4 className="font-semibold mb-4 flex items-center gap-2 text-foreground">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Comments ({selectedIssue.comments?.length || 0})
                </h4>
                
                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                  {selectedIssue.comments?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first to comment!</p>
                  ) : (
                    selectedIssue.comments?.map(comment => (
                      <div key={comment.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm text-foreground">{comment.userName}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{comment.text}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-all transform hover:scale-105 disabled:hover:scale-100 shadow-md"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .leaflet-popup-tip {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default MapView;