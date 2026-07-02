// ================================================
// TRPC Fetch Interceptor
// Intercepts TRPC calls from the compiled React app
// and redirects them to the local REST API.
// Returns data in the EXACT superjson format the client expects.
// ================================================

(function() {
    var originalFetch = window.fetch;

    window.fetch = function(url, options) {
        var urlStr = typeof url === 'string' ? url : (url && url.url ? url.url : String(url));

        console.log('[TRPC Interceptor] Fetch called:', urlStr);

        // Only intercept TRPC requests
        if (urlStr.indexOf('/api/trpc/') === -1) {
            return originalFetch.apply(this, arguments);
        }

        console.log('[TRPC Interceptor] Intercepting:', urlStr);

        var pathMatch = urlStr.match(/\/api\/trpc\/([^?]+)/);
        if (!pathMatch) return originalFetch.apply(this, arguments);

        var procedures = pathMatch[1].split(',');
        var urlObj;
        try { urlObj = new URL(urlStr, window.location.origin); } catch(e) { return originalFetch.apply(this, arguments); }

        var inputParam = urlObj.searchParams.get('input');
        var inputs = {};
        if (inputParam) {
            try { inputs = JSON.parse(inputParam); } catch(e) {}
        }

        var promises = procedures.map(function(proc, index) {
            var input = inputs[String(index)] || inputs;
            return handleProcedure(proc, input);
        });

        return Promise.all(promises).then(function(results) {
            // Batch response is an ARRAY (not an object)
            var body = JSON.stringify(results);
            // console.log('[TRPC Interceptor] Responding with', results.length, 'results');
            return new Response(body, {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }).catch(function(err) {
            console.error('[TRPC Interceptor] Error:', err);
            // Fallback to original fetch
            return originalFetch.apply(window, [url, options]);
        });
    };

    function handleProcedure(proc, input) {
        // ---- auth.me ----
        if (proc === 'auth.me') {
            return Promise.resolve({
                result: { data: { json: null } }
            });
        }

        // ---- globalViews.getCounter ----
        if (proc === 'globalViews.getCounter') {
            return originalFetch('/api/stats/online').then(function(r) {
                return r.json();
            }).then(function(d) {
                return {
                    result: { data: { json: { totalViews: d.count || 1 } } }
                };
            }).catch(function() {
                return {
                    result: { data: { json: { totalViews: 1 } } }
                };
            });
        }

        // ---- articles.list ----
        if (proc === 'articles.list') {
            return originalFetch('/api/content/articles').then(function(r) {
                return r.json();
            }).then(function(data) {
                var limit = 20;
                if (input && input.json && input.json.limit) limit = input.json.limit;
                var items = (data || []).slice(0, limit);
                var mapped = items.map(function(item) {
                    return {
                        article: mapArticle(item),
                        author: mapAuthor(item)
                    };
                });
                var meta = { values: {} };
                items.forEach(function(_, i) {
                    meta.values[i + '.article.createdAt'] = ['Date'];
                    meta.values[i + '.article.updatedAt'] = ['Date'];
                    meta.values[i + '.article.publishedAt'] = ['Date'];
                    meta.values[i + '.author.createdAt'] = ['Date'];
                    meta.values[i + '.author.updatedAt'] = ['Date'];
                });
                return { result: { data: { json: mapped, meta: meta } } };
            }).catch(function(err) {
                // console.error('[TRPC Interceptor] articles.list error:', err);
                return { result: { data: { json: [], meta: { values: {} } } } };
            });
        }

        // ---- articles.get & getBySlug ----
        if (proc === 'articles.get' || proc === 'articles.getBySlug') {
            var artId = (input && input.json) ? (input.json.id || input.json.slug || (typeof input.json === 'string' ? input.json : null)) : null;
            if (!artId) return Promise.resolve({ result: { data: { json: null } } });

            return originalFetch('/api/content/articles/' + artId).then(function(r) {
                return r.json();
            }).then(function(item) {
                var meta = { values: {} };
                meta.values['article.createdAt'] = ['Date'];
                meta.values['article.updatedAt'] = ['Date'];
                meta.values['article.publishedAt'] = ['Date'];
                meta.values['author.createdAt'] = ['Date'];
                meta.values['author.updatedAt'] = ['Date'];
                return {
                    result: {
                        data: {
                            json: { article: mapArticle(item), author: mapAuthor(item) },
                            meta: meta
                        }
                    }
                };
            }).catch(function() {
                return { result: { data: { json: null } } };
            });
        }

        // ---- videos.list ----
        if (proc === 'videos.list') {
            return originalFetch('/api/content/videos').then(function(r) {
                return r.json();
            }).then(function(data) {
                var limit = 20;
                if (input && input.json && input.json.limit) limit = input.json.limit;
                var items = (data || []).slice(0, limit);
                var mapped = items.map(function(item) {
                    return {
                        video: mapVideo(item),
                        author: mapAuthor(item)
                    };
                });
                var meta = { values: {} };
                items.forEach(function(_, i) {
                    meta.values[i + '.video.createdAt'] = ['Date'];
                    meta.values[i + '.video.updatedAt'] = ['Date'];
                    meta.values[i + '.video.publishedAt'] = ['Date'];
                    meta.values[i + '.author.createdAt'] = ['Date'];
                    meta.values[i + '.author.updatedAt'] = ['Date'];
                });
                return { result: { data: { json: mapped, meta: meta } } };
            }).catch(function(err) {
                // console.error('[TRPC Interceptor] videos.list error:', err);
                return { result: { data: { json: [], meta: { values: {} } } } };
            });
        }

        // ---- videos.get & getBySlug ----
        if (proc === 'videos.get' || proc === 'videos.getBySlug') {
            var vidId = (input && input.json) ? (input.json.id || input.json.slug || (typeof input.json === 'string' ? input.json : null)) : null;
            if (!vidId) return Promise.resolve({ result: { data: { json: null } } });

            return originalFetch('/api/content/videos/' + vidId).then(function(r) {
                return r.json();
            }).then(function(item) {
                var meta = { values: {} };
                meta.values['video.createdAt'] = ['Date'];
                meta.values['video.updatedAt'] = ['Date'];
                meta.values['video.publishedAt'] = ['Date'];
                meta.values['author.createdAt'] = ['Date'];
                meta.values['author.updatedAt'] = ['Date'];
                return {
                    result: {
                        data: {
                            json: { video: mapVideo(item), author: mapAuthor(item) },
                            meta: meta
                        }
                    }
                };
            }).catch(function() {
                return { result: { data: { json: null } } };
            });
        }

        // ---- news.list ----
        if (proc === 'news.list') {
            return originalFetch('/api/content/articles').then(function(r) {
                return r.json();
            }).then(function(data) {
                var limit = 20;
                if (input && input.json && input.json.limit) limit = input.json.limit;
                var items = (data || []).slice(0, limit);
                var mapped = items.map(function(item) {
                    return {
                        news: mapArticle(item), // React expects 'news' here
                        author: mapAuthor(item)
                    };
                });
                var meta = { values: {} };
                items.forEach(function(_, i) {
                    meta.values[i + '.news.createdAt'] = ['Date'];
                    meta.values[i + '.news.updatedAt'] = ['Date'];
                    meta.values[i + '.news.publishedAt'] = ['Date'];
                    meta.values[i + '.author.createdAt'] = ['Date'];
                    meta.values[i + '.author.updatedAt'] = ['Date'];
                });
                return { result: { data: { json: mapped, meta: meta } } };
            }).catch(function(err) {
                // console.error('[TRPC Interceptor] news.list error:', err);
                return { result: { data: { json: [], meta: { values: {} } } } };
            });
        }

        // ---- news.get & getBySlug ----
        if (proc === 'news.get' || proc === 'news.getBySlug') {
            var newsId = (input && input.json) ? (input.json.id || input.json.slug || (typeof input.json === 'string' ? input.json : null)) : null;
            if (!newsId) return Promise.resolve({ result: { data: { json: null } } });

            return originalFetch('/api/content/articles/' + newsId).then(function(r) {
                return r.json();
            }).then(function(item) {
                var meta = { values: {} };
                meta.values['news.createdAt'] = ['Date'];
                meta.values['news.updatedAt'] = ['Date'];
                meta.values['news.publishedAt'] = ['Date'];
                meta.values['author.createdAt'] = ['Date'];
                meta.values['author.updatedAt'] = ['Date'];
                return {
                    result: {
                        data: {
                            json: { news: mapArticle(item), author: mapAuthor(item) },
                            meta: meta
                        }
                    }
                };
            }).catch(function() {
                return { result: { data: { json: null } } };
            });
        }

        // ---- Unknown procedure ----
        if (proc.includes('comment') || proc.includes('Comment')) {
            return Promise.resolve({
                result: { data: { json: [] } }
            });
        }
        // console.warn('[TRPC Interceptor] Unknown procedure:', proc);
        return Promise.resolve({
            result: { data: { json: null } }
        });
    }

    // Map local DB article to the exact format the React app expects
    function mapArticle(item) {
        var now = new Date().toISOString();
        return {
            id: item.id,
            authorId: item.author_id || 1,
            title: item.title || '',
            slug: item.slug || (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            subtitle: item.subtitle || '',
            description: item.description || null,
            content: item.content || '',
            coverImage: item.image_url || item.cover_image || null,
            published: item.status === 'published' || item.published === 1 || true,
            createdAt: item.created_at || now,
            updatedAt: item.updated_at || item.created_at || now,
            publishedAt: item.published_at || item.created_at || now
        };
    }

    // Map local DB video to the exact format the React app expects
    function mapVideo(item) {
        var now = new Date().toISOString();
        var ytId = null;
        if (item.video_url) {
            var m = item.video_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
            if (m) ytId = m[1];
        }
        return {
            id: item.id,
            authorId: item.author_id || 1,
            title: item.title || '',
            slug: item.slug || (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            description: item.description || item.content || '',
            youtubeVideoId: ytId,
            youtubeUrl: item.video_url || null,
            thumbnailUrl: item.thumbnail_url || null,
            published: item.status === 'published' || item.published === 1 || true,
            createdAt: item.created_at || now,
            updatedAt: item.updated_at || item.created_at || now,
            publishedAt: item.published_at || item.created_at || now
        };
    }

    // Map author data
    function mapAuthor(item) {
        var now = new Date().toISOString();
        return {
            id: item.author_id || 1,
            userId: item.author_id || 1,
            displayName: item.author || 'Autor',
            bio: null,
            profileImage: null,
            youtubeChannelName: null,
            youtubeChannelUrl: null,
            youtubeChannelLogo: null,
            createdAt: item.created_at || now,
            updatedAt: item.updated_at || item.created_at || now
        };
    }
})();
