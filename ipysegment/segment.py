#!/usr/bin/env python
# coding: utf-8

# Copyright (c) Ian Hunt-Isaak.
# Distributed under the terms of the Modified BSD License.

"""
TODO: Add module docstring
"""

from ipywidgets import DOMWidget
from traitlets import Unicode
from ._frontend import module_name, module_version


from traitlets import Bool, Bytes, CInt, Enum, Float, Instance, List, Unicode


class segmenter(DOMWidget):
    """TODO: Add docstring here
    """
    _model_name = Unicode('segmentModel').tag(sync=True)
    _model_module = Unicode(module_name).tag(sync=True)
    _model_module_version = Unicode(module_version).tag(sync=True)
    _view_name = Unicode('segmentView').tag(sync=True)
    _view_module = Unicode(module_name).tag(sync=True)
    _view_module_version = Unicode(module_version).tag(sync=True)

    value = Unicode('Hello World').tag(sync=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.on_msg(self.handle_msg)

    width = CInt(700).tag(sync=True)
    height = CInt(500).tag(sync=True)

    def gogogo(self):
        command = {
            'name': 'gogogo'
        }
        self.send(command, [])

    def yikes(self, start):
        command = {
            'name': 'yikes',
            'start': start
        }
        self.send(command, [])

    def handle_msg(self, widget, content, buffers):
        # print('widget:', widget)
        # print(content)
        # self.gogogo()
        self.yikes(content['start'])