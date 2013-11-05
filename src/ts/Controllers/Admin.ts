module Shot {
	export module Controllers {
		/**
		 * Admin controller
		 */
		export class Admin {
			/**
			 * Index action
			 */
			index() {
				var
					thumbnailGrid = $('.thumbnail-grid'),
					albums = [];

				if ( SHOT.albums ) {
					SHOT.albums.forEach((albumData) => {
						var album = new Models.Album(albumData);

						album.data.link = SHOT.rootPath + 'admin/album/' + album.data.id;

						thumbnailGrid.prepend(album.render().el);

						albums.push(album);
					});
				}

				$('#album').on('submit', (e) => {
					var
						album: Models.Album = null,
						title: string = $('#title').val();

					e.preventDefault();

					if ( title ) {
						album = new Models.Album({ title: title }).render();

						album.save()
							.done((data) => {
								album.data.link = SHOT.rootPath + 'admin/album/' + data.id;

								album.render();
							})
							.fail((e) => {
								console.log('fail');
							});

						albums.push(album);

						thumbnailGrid.prepend(album.el);
					}
				});
			}

			/**
			 * Album action
			 */
			album() {
				var
					thumbnailSize = 480,
					thumbnailGrid = $('.thumbnail-grid'),
					thumbnails: Models.Thumbnail[] = [],
					thumbnailQueue: Models.Thumbnail[] = [],
					fileTypes = [
						'image/jpg',
						'image/jpeg',
						'image/png',
						'image/gif',
						'image/bmp'
					],
					preRender: (thumbnail: Models.Thumbnail, callback: () => void) => void;

				// Add thumbnails to grid
				if ( SHOT.thumbnails ) {
					SHOT.thumbnails.forEach((thumbnailData) => {
						var thumbnail = new Models.Thumbnail(thumbnailData);

						thumbnail.data.link = SHOT.rootPath + 'album/carousel/' + SHOT.album.id + '/' + thumbnail.data.id;

						thumbnailGrid.append(thumbnail.render().el);

						thumbnails.push(thumbnail);
					});
				}

				$('#files').on('change', (e) => {
					$.each(e.target.files, (i, file) => {
						var
							thumbnail,
							progressBar;

						if ( file.name && $.inArray(file.type, fileTypes) !== -1 ) {
							thumbnail   = new Models.Thumbnail({ title: file.name.replace(/\..{1,4}$/, ''), file: file, formData: new FormData() }).render();
							progressBar = new Models.ProgressBar().render();

							thumbnail.data.formData.append('image', file);
							thumbnail.data.formData.append('albumId', SHOT.album.id);

							thumbnail.el.find('.container').append(progressBar.el);

							thumbnailGrid.prepend(thumbnail.el);

							thumbnail.save()
								.done((data) => {
									progressBar.set(100, () => {
										var image = $('<img/>');

										image
											.hide()
											.on('load', (e) => {
												// Replace temporary thumbnail with processed image
												thumbnail.el.find('.temporary').fadeOut('fast', function() {
													$(this).remove();
												});

												// Remove processing indicator
												thumbnail.el.find('.processing').fadeOut('fast');

												// Reveal the processed image
												$(e.target).fadeIn('fast', () => {
													thumbnail.data.link = SHOT.rootPath + 'album/carousel/' + SHOT.album.id + '/' + data.id;

													thumbnail.render();
												});
											})
											.prependTo(thumbnail.el.find('.container'))
											.prop('src', data.path);
									});
								})
								.progress((data) => {
									progressBar.set(data);
								})
								.fail((e) => {
									progressBar.set(0);

									thumbnail.el.find('.container').addClass('error');

									console.log('fail');
								});

							thumbnails.push(thumbnail);
							thumbnailQueue.push(thumbnail);
						}
					});

					/**
					 * Pre render thumbnail
					 */
					preRender = (thumbnail, callback) => {
						var reader = new FileReader();

						callback = typeof callback === 'function' ? callback : () => {};

						// Generate temporary thumbnail
						reader.onload = (e) => {
							var image = $('<img/>');

							image.on('load', (e) => {
								var
									canvas = $('<canvas/>').get(0),
									size = {
										x: e.target.width  < e.target.height ? thumbnailSize : e.target.width  * thumbnailSize / e.target.height,
										y: e.target.height < e.target.width  ? thumbnailSize : e.target.height * thumbnailSize / e.target.width
										};

								canvas.width  = thumbnailSize;
								canvas.height = thumbnailSize;

								// Center image on canvas
								canvas
									.getContext('2d')
									.drawImage(e.target, ( canvas.width - size.x ) / 2, ( canvas.height - size.y ) / 2, size.x, size.y);

								$(canvas)
									.hide()
									.fadeIn('fast')
									.addClass('temporary')
									.prependTo(thumbnail.el.find('.container'));

								callback();
							});

							image.on('error', () => callback());

							image.prop('src', e.target.result);
						}

						reader.onerror = () => callback();

						reader.readAsDataURL(thumbnail.data.file);
					};

					// Pre render all thumbnails, one at a time
					(function nextThumbnail() {
						if ( thumbnailQueue.length ) {
							preRender(thumbnailQueue.shift(), () => nextThumbnail());
						}
					})();
				});
			}
		}
	}
}