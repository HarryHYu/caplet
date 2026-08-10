import '@google/model-viewer';

/** Interactive 3D model viewer (orbit/zoom) for a user-uploaded .glb/.gltf, served from our own S3 bucket. */
export default function Forum3DModelBlock({ data }) {
  const { url } = data || {};
  if (!url) return null;
  return (
    <div className="forum-card overflow-hidden p-0">
      <model-viewer
        src={url}
        camera-controls=""
        auto-rotate=""
        shadow-intensity="1"
        loading="eager"
        reveal="auto"
        alt="Uploaded 3D model"
        style={{ width: '100%', height: 360, background: 'var(--surface-soft)', display: 'block' }}
      />
    </div>
  );
}
